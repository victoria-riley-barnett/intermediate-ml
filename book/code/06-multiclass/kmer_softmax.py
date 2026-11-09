# Count k-mers, then turn seven scores into a loss. Plain Python, no libraries.
# The softmax follows SmolML's smolml/utils/activation/activation.py (subtract the max first);
# the loss follows categorical_cross_entropy in smolml/utils/losses/losses.py. The k-mer
# counter and the gradient line are ours. SmolML is MIT, by Pablo Rodriguez Martin.
import math
from itertools import product

def kmer_counts(seq, k):
    columns = ["".join(p) for p in product("ACGT", repeat=k)]   # 4**k columns, fixed order
    counts = {c: 0 for c in columns}
    for i in range(len(seq) - k + 1):
        counts[seq[i:i + k]] += 1
    return counts

def softmax(z):
    top = max(z)                                  # subtract the largest score: same answer, no overflow
    exps = [math.exp(s - top) for s in z]
    total = sum(exps)
    return [e / total for e in exps]

def cross_entropy(q, true_class):
    return -math.log(max(q[true_class], 1e-15))   # one-hot truth leaves one term

seq = "ACGTACGTTAGC"
counts = kmer_counts(seq, 2)
print(len(seq), "bases ->", sum(counts.values()), "windows,", len(counts), "columns")
print({k: v for k, v in counts.items() if v})

z = [2.0, 1.0, -1.0, 0.5, -0.3, 1.8, 0.2]         # seven logits from the lecture
q = softmax(z)
print("q =", [round(p, 2) for p in q], " sum =", round(sum(q), 4))
print("decision:", q.index(max(q)), " true class: 5")
print("loss:", round(cross_entropy(q, 5), 2))
y = [1 if i == 5 else 0 for i in range(7)]
print("q - y =", [round(p - t, 2) for p, t in zip(q, y)])
print("same softmax after adding 1000:", [round(p, 2) for p in softmax([s + 1000 for s in z])])
