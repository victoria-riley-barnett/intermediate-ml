# Three ways to turn a (L, 20) grid into a fixed-width vector, in plain Python.
# Not adapted from SmolML (it has no sequence code); written by us in the same style.
import random

RESIDUES = "ACDEFGHIKLMNPQRSTVWY"
FILLER = [r for r in RESIDUES if r not in "WC"]

def make_string(w_first, early, late, rng, length=48):
    s = [rng.choice(FILLER) for _ in range(length)]
    a, b = ("WWW", "CCC") if w_first else ("CCC", "WWW")
    s[early:early + 3] = a
    s[late:late + 3] = b
    return "".join(s)

def one_hot(s):                       # the grid: one row of 20 numbers per position
    return [[1.0 if r == c else 0.0 for c in RESIDUES] for r in s]

def average(grid):                    # (L, 20) -> 20 numbers
    L = len(grid)
    return [sum(row[j] for row in grid) / L for j in range(len(grid[0]))]

def flatten(grid):                    # (L, 20) -> L * 20 numbers
    return [x for row in grid for x in row]

def slide(grid, motif):               # match count at every start, then the maximum
    k = len(motif)
    counts = []
    for i in range(len(grid) - k + 1):
        counts.append(sum(grid[i + t][RESIDUES.index(motif[t])] for t in range(k)))
    return counts

rng = random.Random(0)
pos = make_string(True, 4, 38, rng)             # WWW first
neg = pos.replace("WWW", "xxx").replace("CCC", "WWW").replace("xxx", "CCC")
print(pos); print(neg)
gp, gn = one_hot(pos), one_hot(neg)

print("average equal:", average(gp) == average(gn))
fp, fn = flatten(gp), flatten(gn)
print("flatten length:", len(fp), " differ in:", sum(a != b for a, b in zip(fp, fn)))
for name, g in (("pos", gp), ("neg", gn)):
    w, c = slide(g, "WWW"), slide(g, "CCC")
    print(name, "max W", max(w), "at", w.index(max(w)), "| max C", max(c), "at", c.index(max(c)))
print("first layer weights, h=64: L=48 ->", 48 * 20 * 64, " L=1024 ->", 1024 * 20 * 64)
print("receptive field, k=5, depth 10:", 1 + 10 * (5 - 1))
