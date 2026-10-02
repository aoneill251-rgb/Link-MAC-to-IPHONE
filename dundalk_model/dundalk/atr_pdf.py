"""Parse At The Races "PDF Form Guide" racecards into the model's CSV layout.

Each guide has today's runners plus up to six recent runs for every horse
(date, course, trip, going, weight, position/draw, beaten distance, jockey,
SP, running comment, official rating). This module returns:

  card:    one row per runner today (prices = ATR's forecast SP, which is a
           guess at the market, not a price you can take)
  history: one row per past run of those runners

History rows hold only the runner in question, not the rest of that race's
field, so `field_size` comes from the "ran" figure in the form line.

Needs the `pdftotext` tool (poppler-utils), or pass in text you have
already extracted with `pdftotext -layout`.
"""

from __future__ import annotations

import re
import subprocess

import numpy as np
import pandas as pd

from .data import parse_odds

COURSES = {
    "dun": "Dundalk", "lay": "Laytown", "bel": "Bellewstown", "fai": "Fairyhouse",
    "nav": "Navan", "cur": "Curragh", "naa": "Naas", "dro": "Down Royal", "ros": "Roscommon",
    "cor": "Cork", "leo": "Leopardstown", "gal": "Galway", "gow": "Gowran Park",
    "lim": "Limerick", "lis": "Listowel", "kil": "Killarney", "sli": "Sligo",
    "tip": "Tipperary", "tra": "Tralee", "bal": "Ballinrobe", "wex": "Wexford",
    "thu": "Thurles", "kgn": "Kilbeggan", "pun": "Punchestown", "clo": "Clonmel",
    "bgh": "Bangor", "wol": "Wolverhampton", "kem": "Kempton", "lin": "Lingfield",
    "chm": "Chelmsford", "cfd": "Chelmsford", "nwc": "Newcastle", "sth": "Southwell",
}
# Polytrack/Tapeta/Fibresand. Laytown is a beach (sand), so it counts as turf here.
AW_COURSES = {"dun", "wol", "kem", "lin", "chm", "cfd", "nwc", "sth"}

MARGINS = {"dht": 0.0, "nse": 0.05, "shd": 0.1, "sht-hd": 0.1, "hd": 0.2, "nk": 0.3,
           "one": 1.0, "two": 2.0, "three": 3.0, "dist": 30.0}
FRACTIONS = {"¼": 0.25, "½": 0.5, "¾": 0.75}

# Where a horse raced early, as a fraction of the field (0 = in front,
# 1 = last), read from the earliest matching phrase in its running comment.
PACE_PHRASES = [
    (r"\b(made all|made most|soon led|led|broke well to lead|disputed lead|disputed the lead)\b", 0.0),
    (r"\b(prominent|close up|handy|pressed leader|tracked leader|chased leader)\b", 0.2),
    (r"\b(tracked leaders|chased leaders|behind leaders|with leaders|in touch with leaders)\b", 0.3),
    (r"\bin touch\b", 0.4),
    (r"\b(mid[- ]?division|midfield)\b", 0.5),
    (r"\brear of mid[- ]?division\b", 0.65),
    (r"\b(towards rear|held up|restrained|settled behind)\b", 0.8),
    (r"\b(always behind|in rear|behind|raced in last|in last|slowly into stride|slowly away|"
     r"dwelt|fly leapt|missed the break|outpaced early)\b", 0.95),
]

RACE_RE = re.compile(r"^\(R(?P<n>\d+)\)\s+(?P<time>\d{1,2}:\d{2})\s+(?P<course>.+?)\s*(?:\((?P<surf>A\.W\.)\))?,\s*(?P<dist>\S+)\s*$")
RUNNER_RE = re.compile(
    r"^\s*(?P<no>\d+)\s*\((?P<draw>\d+)\)\s+(?P<form>[\dPFURBCDOS/-]*)\s+"
    r"(?P<name>[A-Z0-9'’.&\- ]+?)(?:\s*\((?P<bred>[A-Z]{2,3})\))?(?:\s*\(EX(?P<ex>\d+)\))?"
    r"(?:\s+(?P<days>\d+))?(?:\s+(?P<tags>(?:CD|C|D|BF)(?:\s+(?:CD|C|D|BF))*))?\s{2,}"
    r"(?P<age>\d)\s*(?P<st>\d{1,2})\s*-\s*(?P<lb>\d+)(?P<gear>[a-z0-9]*)\s{2,}"
    r"(?P<jockey>.+?)(?:\s{2,}(?P<or>\d+|-))?\s*$")
RUN_RE = re.compile(
    r"^(?P<date>\d{2} [A-Z][a-z]{2} \d{2})\s+(?P<course>[A-Za-z]{2,4})\s+"
    r"(?P<dist>[\d.]+f|\d+m(?:[\d.]+f)?)\s+(?P<type>.*?)\s{2,}(?P<going>\S+)\s+"
    r"(?P<wt>\d+-\d+)(?P<gear>\S*)\s+(?P<pos>\w+)/(?P<ran>\d+)(?:\s*\((?P<draw>\d+)\))?\s+"
    r"(?P<jockey>.+?)\s+(?P<sp>\d+/\d+\S*|[Ee]vens?\S*|Evs\S*)\s+(?P<comment>.*?)\s*(?P<or>\b\d+|-)?\s*$")
MARGIN_RE = re.compile(r"(?:^|\s)(?P<m>\d*[¼½¾]?|nse|shd|sht-hd|hd|nk|dht|dist|one|two|three)\s*(?:len)?(?=\s|$)")


def to_furlongs(s: str) -> float:
    s = s.lower().strip()
    m = re.fullmatch(r"(?:(\d+)m)?(?:([\d.]+)f)?(?:(\d+)y)?", s)
    if not m or not any(m.groups()):
        return np.nan
    miles, fur, yds = (float(x) if x else 0.0 for x in m.groups())
    return miles * 8 + fur + yds / 220


def margin_lengths(s: str) -> float:
    s = s.strip().lower()
    if s in MARGINS:
        return MARGINS[s]
    whole = re.match(r"\d+", s)
    v = float(whole.group()) if whole else 0.0
    for ch, frac in FRACTIONS.items():
        if ch in s:
            v += frac
    return v


def pace_position(comment: str) -> float:
    c = comment.lower()[:70]
    best = None
    for pattern, pct in PACE_PHRASES:
        m = re.search(pattern, c)
        if m:
            key = (m.start(), -len(m.group()))
            if best is None or key < best[0]:
                best = (key, pct)
    return best[1] if best else np.nan


def _tidy_name(raw: str) -> str:
    name = " ".join(w.capitalize() for w in raw.strip().split())
    return re.sub(r"(['’])S\b", r"\1s", name)


def pdf_to_text(path: str) -> str:
    return subprocess.run(["pdftotext", "-layout", path, "-"], check=True,
                          capture_output=True, text=True).stdout


def _race_type(title: str) -> str:
    t = title.lower()
    for key, label in (("nursery", "Nursery"), ("handicap", "Handicap"), ("maiden", "Maiden"),
                       ("listed", "Listed"), ("group", "Group"), ("claim", "Claimer"),
                       ("stakes", "Stakes")):
        if key in t:
            return label
    return "Conditions"


def _hist_type(details: str) -> str:
    d = details.lower()
    for key, label in (("hcp", "Handicap"), ("mdn", "Maiden"), ("claim", "Claimer"),
                       ("list", "Listed"), ("grp", "Group"), ("stks", "Stakes"), ("cond", "Conditions")):
        if key in d:
            return label
    return "Other"


def parse_text(text: str, meeting_date: str):
    lines = text.replace("\f", "\n").split("\n")
    meeting_date = pd.Timestamp(meeting_date)
    card, hist = [], []
    race = None
    runner = None
    pending = None   # the last history row, still collecting continuation lines
    seen = {}
    result_line = ""  # "1st X, 2nd Y, 3rd Z" printed above each form line

    def finish_pending():
        nonlocal pending
        if pending is not None:
            hist.append(pending)
            pending = None

    for i, line in enumerate(lines):
        m = RACE_RE.match(line.strip())
        if m:
            finish_pending()
            title = lines[i + 1].strip() if i + 1 < len(lines) else ""
            dist_s = m.group("dist")
            race = {
                "race_id": f"{meeting_date.date()}-dun-{m.group('time').replace(':', '')}",
                "date": meeting_date.date().isoformat(), "off_time": m.group("time"),
                "course": m.group("course").title(), "surface": "AW" if m.group("surf") else "Turf",
                "distance_f": to_furlongs(dist_s), "race_title": title, "race_type": _race_type(title),
            }
            runner = None
            continue
        if race is None:
            continue

        m = RUNNER_RE.match(line)
        if m and "Race Details" not in line:
            finish_pending()
            jockey = re.sub(r"\s*\(\d+\)\s*$", "", m.group("jockey")).strip()
            claim = re.search(r"\((\d+)\)\s*$", m.group("jockey"))
            name = _tidy_name(m.group("name"))
            key = (race["race_id"], name)
            if key in seen:
                # The guide lists each runner twice: summary, then full form.
                runner = seen[key]
                continue
            trainer = lines[i + 1].strip() if i + 1 < len(lines) else ""
            if i + 2 < len(lines):  # long trainer names wrap onto the next line
                tail = lines[i + 2][95:].strip()
                if tail and "Notes" not in tail:
                    trainer += " " + tail
            runner = {
                **race, "horse_id": name, "horse_name": name, "cloth": int(m.group("no")),
                "draw": int(m.group("draw")), "form_figures": m.group("form"),
                "age": int(m.group("age")), "weight_lbs": int(m.group("st")) * 14 + int(m.group("lb")),
                "headgear": m.group("gear"), "jockey": jockey,
                "jockey_claim": int(claim.group(1)) if claim else 0,
                "trainer": trainer, "official_rating": pd.to_numeric(m.group("or"), errors="coerce"),
                "days_since_run": pd.to_numeric(m.group("days"), errors="coerce"),
                "course_distance_tags": m.group("tags") or "",
            }
            card.append(runner)
            seen[key] = runner
            continue
        if runner is None:
            continue

        fc = re.search(r"\(Forecast ([^)]+)\)", line)
        if fc:
            runner["forecast_sp"] = fc.group(1)
        aw = re.search(r"All Weather:\s*(\d+)\s*-\s*(\d+)", line)
        if aw:
            runner["aw_starts"], runner["aw_wins"] = int(aw.group(1)), int(aw.group(2))
        ft = re.search(r"Flat Turf:\s*(\d+)\s*-\s*(\d+)", line)
        if ft:
            runner["turf_starts"], runner["turf_wins"] = int(ft.group(1)), int(ft.group(2))

        m = RUN_RE.match(line)
        if m:
            finish_pending()
            code = m.group("course").lower()
            pos = m.group("pos")
            st, lb = m.group("wt").split("-")
            jockey = m.group("jockey")
            claim = re.search(r"\((\d+)\)\s*$", jockey)
            winner = re.match(r"1st (.+?),", result_line)
            winner = _tidy_name(winner.group(1)) if winner else ""
            # Same id for every runner in the race, whichever horse's form it came from.
            pending = {
                "race_id": f"{pd.to_datetime(m.group('date'), format='%d %b %y').date()}-{code}-"
                           f"{m.group('dist')}-{m.group('type').strip().replace(' ', '_')}-"
                           f"{winner.replace(' ', '_')}",
                "winner": winner,
                "date": pd.to_datetime(m.group("date"), format="%d %b %y").date().isoformat(),
                "course": COURSES.get(code, code.title()),
                "surface": "AW" if code in AW_COURSES else "Turf",
                "distance_f": to_furlongs(m.group("dist")), "race_type": _hist_type(m.group("type")),
                "going": m.group("going"), "horse_id": runner["horse_id"],
                "horse_name": runner["horse_name"], "weight_lbs": int(st) * 14 + int(lb),
                "headgear": m.group("gear"),
                "finish_pos": int(pos) if pos.isdigit() else 0, "field_size": int(m.group("ran")),
                "draw": pd.to_numeric(m.group("draw"), errors="coerce"),
                "jockey": re.sub(r"\s*\(\d+\)\s*$", "", jockey).strip(),
                "jockey_claim": int(claim.group(1)) if claim else 0,
                "sp_decimal": parse_odds(re.sub(r"(?<=\d)[a-z]+\d*$", "", m.group("sp").lower())
                                         if m.group("sp")[0].isdigit() else "evs"),
                "official_rating": pd.to_numeric(m.group("or"), errors="coerce"),
                "comment": m.group("comment").strip(), "beaten_lengths": np.nan,
            }
            continue

        if line.strip().startswith("1st "):
            result_line = line.strip()
        if pending is not None:
            stripped = line.strip()
            if not stripped or stripped.startswith("1st ") or stripped.startswith("©"):
                if stripped.startswith("1st ") or stripped.startswith("©"):
                    finish_pending()
                continue
            # Continuation lines: the draw "(19)", the margin "6¾ len", a
            # wrapped jockey claim and more of the comment, split by columns.
            parts = re.split(r"\s{2,}", stripped)
            for part in parts:
                d = re.fullmatch(r"\((\d+)\)", part)
                if d and np.isnan(pending["draw"]) and line.index(part) < 70:
                    pending["draw"] = int(d.group(1))
                    continue
                mm = re.fullmatch(r"(\d*[¼½¾]?|nse|shd|sht-hd|hd|nk|dht|dist|one|two|three)(\s*len)?", part)
                if mm and part and np.isnan(pending["beaten_lengths"]):
                    pending["beaten_lengths"] = margin_lengths(mm.group(1))
                    continue
                if line.index(part) > 90:
                    pending["comment"] += " " + part
    finish_pending()

    card = pd.DataFrame(card)
    if not card.empty:
        # Reserves only run if a declared horse comes out.
        card = card[~card["jockey"].str.match(r"Reserve\b")].reset_index(drop=True)
    hist = pd.DataFrame(hist)
    if not hist.empty:
        hist.loc[hist["finish_pos"] == 1, "beaten_lengths"] = 0.0
        pct = hist["comment"].map(pace_position)
        hist["early_pos"] = (1 + pct * (hist["field_size"] - 1)).round()
        hist = hist.drop_duplicates(["horse_id", "date"])
    if not card.empty:
        card["early_price"] = card.get("forecast_sp", pd.Series(dtype=object)).map(parse_odds)
    return card, hist


def parse_pdf(path: str, meeting_date: str):
    return parse_text(pdf_to_text(path), meeting_date)


def date_from_filename(path: str) -> str | None:
    m = re.search(r"(20\d{2})(\d{2})(\d{2})", path)
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else None
