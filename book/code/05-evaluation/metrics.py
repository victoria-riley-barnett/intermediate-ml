# Confusion counts and three metrics in plain Python (ours, written in the style of SmolML).

def counts(y_true, y_pred):
    """Return the four counts (tp, fp, fn, tn) for labels that are 0 or 1."""
    tp = fp = fn = tn = 0
    for t, p in zip(y_true, y_pred):
        if t == 1 and p == 1: tp += 1
        elif t == 0 and p == 1: fp += 1
        elif t == 1 and p == 0: fn += 1
        else: tn += 1
    return tp, fp, fn, tn

def ratio(top, bottom):
    """A metric with an empty denominator has no value, so say so."""
    return None if bottom == 0 else round(top / bottom, 3)

def report(y_true, y_pred):
    tp, fp, fn, tn = counts(y_true, y_pred)
    return {"TP": tp, "FP": fp, "FN": fn, "TN": tn,
            "accuracy": ratio(tp + tn, tp + fp + fn + tn),
            "recall": ratio(tp, tp + fn),        # denominator: rows that are truly 1
            "precision": ratio(tp, tp + fp)}     # denominator: rows the model called 1

# Ten rows, invented to give the counts worked out by hand.
true_10 = [1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
pred_10 = [1, 1, 1, 1, 0, 1, 1, 0, 0, 0]
print(report(true_10, pred_10))

# The rule with no model, on a nine-to-one slice: 20 ones, 180 zeros.
y = [1] * 20 + [0] * 180
print(report(y, [0] * 200))

# The plate's high cut: 3 caught, 17 missed, 2 false alarms, 178 cleared.
pred = [1] * 3 + [0] * 17 + [1] * 2 + [0] * 178
print(report(y, pred))
