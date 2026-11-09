# Ours, in the style of SmolML (no SmolML code for splits or dropout).
import random

def stratified_split(labels, fractions, seed):
    """Cut row indexes into train/val/test, keeping each label's share the same."""
    rng = random.Random(seed)
    parts = [[] for _ in fractions]
    for lab in sorted(set(labels)):
        rows = [i for i, l in enumerate(labels) if l == lab]
        rng.shuffle(rows)
        a = round(len(rows) * fractions[0])
        b = a + round(len(rows) * fractions[1])
        for part, cut in zip(parts, (rows[:a], rows[a:b], rows[b:])):
            part.extend(cut)
    return parts

def dropout(values, p, rng, training):
    """Zero each value with probability p; scale the rest by 1/(1-p). Off at eval."""
    if not training:
        return list(values)
    return [0.0 if rng.random() < p else v / (1 - p) for v in values]

labels = ["kinase"] * 10 + ["channel"] * 10
train, val, test = stratified_split(labels, (0.6, 0.2, 0.2), seed=42)
print("sizes", len(train), len(val), len(test))
print("channels in val:", sum(labels[i] == "channel" for i in val))

seqs = ["AAC", "GGT", "AAC", "TTA", "CCG", "GGT", "ACG", "TTA"]
seen = set(seqs[:5])
print("has_twin:", [s in seen for s in seqs[5:]])

h = [1.0, 2.0, 3.0, 4.0]
rng = random.Random(0)
print("train:", dropout(h, 0.5, rng, True))
print("train:", dropout(h, 0.5, rng, True))
print("eval: ", dropout(h, 0.5, rng, False))
print("eval: ", dropout(h, 0.5, rng, False))
