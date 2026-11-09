# A lookup table, an averaged context and a linear head, in plain Python.
# The id step follows SmolML's tokenizers (smolml/preprocessing/tokenizers);
# the table, the mean and the head are ours.
import math

ALPHABET = "ACDEFGHIKLMNPQRSTVWY"
token_to_id = {aa: i for i, aa in enumerate(ALPHABET)}

window = "ALVIDKG"                       # invented; centre residue I is the target
centre = len(window) // 2
context = window[:centre] + window[centre + 1:]
ids = [token_to_id[aa] for aa in context]
target = token_to_id[window[centre]]
print("ids:", ids, "target:", target)

# Table of 20 rows x 8 numbers. Only the six rows we need are filled in
# (the lecture's rows, chosen for arithmetic, not trained).
table = [[0.0] * 8 for _ in ALPHABET]
for aa, (a, b) in zip("ALVDKG", [(2, 0), (1, 1), (0, 2), (2, 0), (1, 1), (0, 2)]):
    table[token_to_id[aa]][:2] = [a, b]

def pool(ids):                            # lookup, then mean column by column
    rows = [table[i] for i in ids]
    return [sum(col) / len(rows) for col in zip(*rows)]

head = [[0.0] * 8 for _ in ALPHABET]      # linear head: 20 scores from 8 numbers
head[target][0] = math.log(4)

def probabilities(ids):
    c = pool(ids)
    scores = [sum(w * x for w, x in zip(row, c)) for row in head]
    exps = [math.exp(s) for s in scores]
    return [e / sum(exps) for e in exps]

p = probabilities(ids)
print("pooled:", pool(ids))
print(f"P(I) = {p[target]:.3f}   loss = {-math.log(p[target]):.3f}")
print("same after reversing the neighbours:", probabilities(ids[::-1]) == p)

def cosine(u, v):
    dot = sum(a * b for a, b in zip(u, v))
    return dot / (math.sqrt(sum(a * a for a in u)) * math.sqrt(sum(b * b for b in v)))

L, D, A = (table[token_to_id[x]] for x in "LDA")
print(f"cos(L, A) = {cosine(L, A):.3f}   cos(A, D) = {cosine(A, D):.3f}")
