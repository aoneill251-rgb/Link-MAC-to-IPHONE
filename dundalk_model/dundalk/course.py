"""What we know about Dundalk going in.

Dundalk is Ireland's only all-weather track: a sharp, left-handed, floodlit
oval racing on Polytrack. Sharp turning tracks usually favour low draws and
prominent racers, especially over shorter trips. The model does not assume
any of this: it estimates draw and pace effects separately for each distance
band from your data. These bands are just how the trips are grouped.
"""

COURSE_NAME = "Dundalk"
SURFACE = "Polytrack"

# Upper bound (furlongs, inclusive) for each distance band.
DISTANCE_BANDS = [
    ("sprint", 6.5),    # 5f, 6f
    ("mile", 8.5),      # 7f, 1m
    ("middle", 12.5),   # 1m2f150y, 1m4f
    ("staying", 99.0),  # 1m6f, 2m
]

BAND_NAMES = [name for name, _ in DISTANCE_BANDS]


def distance_band(furlongs: float) -> str:
    for name, upper in DISTANCE_BANDS:
        if furlongs <= upper:
            return name
    return DISTANCE_BANDS[-1][0]


def is_dundalk(course) -> bool:
    return isinstance(course, str) and course.strip().lower().startswith("dundalk")
