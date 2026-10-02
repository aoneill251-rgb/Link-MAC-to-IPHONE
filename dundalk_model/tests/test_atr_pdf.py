"""Parser tests on a small hand-written extract in the pdftotext -layout format."""

import numpy as np

from dundalk import atr_pdf

SAMPLE = """\
(R1) 17:00 DUNDALK (A.W.), 5f
Example Handicap (0-60) (Class ) (3YO plus)
No(Dr)      Silk        Form        Horse Details                                      Age/Wt       Jockey/Trainer     OR

1 (4)                        090511        EXAMPLE STAR 7 C                                                5 10 - 5                    Ann Rider (7)                          63
                                                                                                                                       A Trainer
                                           b g Sire - Dam

Expert View: In fine form.  (Forecast 15/8)

CAREER STATS (Starts - Wins - 2nds - 3rds)

Flat Turf: 12 - 1 - 2 - 0                                Jumps: 0 - 0 - 0 - 0                                  All Weather: 6 - 1 - 1 - 0

RECENT RACE BY RACE HISTORY

Date             Race Details         Going      Weight         Res (Dr)    Jockey           SP       1-2-3 Result / Close-up                                                  OR

                                                                                                      1st EXAMPLE STAR, 2nd Other One, 3rd Other Two
25 Sep 26        dun 6f App Hcp 7K    St         8-6           1/13 (5)     Ann Rider (7)    8/11f    tracked leaders, 4th halfway, ridden to lead over 1f                     55
                                                 (ex7)         1½ len                                 out, kept on well inside final furlong

                                                                                                      1st Winner Horse, 2nd Other Three, 3rd Other Four
29 Aug 26        Cur 6f App Hcp 11K   Yl         8-12p1        14/19        Bob Rider        12/1     towards rear, pushed along and no impression 2f out, kept on one         54
                                                               (19)                                   pace, never a factor

                                                               12 len

2 (1)                             DEBUT FILLY (GB)                                   29-2         Reserve 1          -
                                                                                                  B Trainer
"""


def test_parse_sample():
    card, hist = atr_pdf.parse_text(SAMPLE, "2026-10-02")
    assert len(card) == 1  # the reserve is dropped
    r = card.iloc[0]
    assert r["horse_name"] == "Example Star"
    assert (r["draw"], r["age"], r["weight_lbs"], r["jockey_claim"]) == (4, 5, 145, 7)
    assert r["official_rating"] == 63 and r["early_price"] == 2.875
    assert (r["aw_starts"], r["aw_wins"]) == (6, 1)

    assert len(hist) == 2
    a, b = hist.sort_values("date").to_dict("records")
    assert b["course"] == "Dundalk" and b["finish_pos"] == 1 and b["beaten_lengths"] == 0
    assert np.isclose(b["sp_decimal"], 1 + 8 / 11) and b["draw"] == 5 and b["field_size"] == 13
    assert a["course"] == "Curragh" and a["finish_pos"] == 14 and a["draw"] == 19
    assert a["beaten_lengths"] == 12 and a["official_rating"] == 54
    assert a["weight_lbs"] == 8 * 14 + 12 and a["early_pos"] == 15  # "towards rear"
    assert "Winner_Horse" in a["race_id"]


def test_helpers():
    assert atr_pdf.to_furlongs("1m2f150y") == 8 + 2 + 150 / 220
    assert atr_pdf.to_furlongs("7.5f") == 7.5
    assert atr_pdf.margin_lengths("6¾") == 6.75
    assert atr_pdf.margin_lengths("shd") == 0.1
    assert atr_pdf.pace_position("soon led, ran freely") == 0.0
    assert atr_pdf.pace_position("rear of mid-division, keen") == 0.65
