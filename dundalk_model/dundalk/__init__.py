"""Dundalk all-weather racing betting model.

Pipeline: results CSV -> point-in-time features -> conditional-logit
"fundamental" model -> Benter-style blend with the market -> fractional
Kelly staking -> walk-forward backtest.
"""

__version__ = "0.1.0"
