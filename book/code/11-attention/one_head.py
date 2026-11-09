"""One attention head in pure Python: lists of floats and math.exp.

Written for this book in the style of SmolML (it is not adapted from SmolML,
which has no attention code). Reproduces the numbers of the attention-worked plate.
"""
import math

Q = [[1, -1, 1, -1], [1, 1, -2, 2], [0, -2, 1, 0], [-2, 2, 1, -1]]
K = [[0, -1, 0, 0], [1, 1, -2, -2], [-1, 1, -1, -2], [2, 0, 0, -1]]
V = [[1, 1, 1, 2], [0, 3, 2, 3], [3, 0, 2, 1], [2, 1, 3, 1]]

def dot(a, b):
    return sum(x * y for x, y in zip(a, b))

def softmax(row):
    exps = [math.exp(s) for s in row]
    total = sum(exps)
    return [e / total for e in exps]

def head(Q, K, V):
    root_d = math.sqrt(len(K[0]))
    S = [[dot(q, k) for k in K] for q in Q]                       # scores
    A = [softmax([s / root_d for s in row]) for row in S]         # weights
    Y = [[sum(a * v[c] for a, v in zip(row, V)) for c in range(len(V[0]))]
         for row in A]                                            # mixtures
    return S, A, Y

S, A, Y = head(Q, K, V)
show = lambda M, nd: [[round(x, nd) for x in r] for r in M]
print("S ", S)
print("A ", show(A, 2))
print("row sums", [round(sum(r), 2) for r in A])
print("Y ", show(Y, 2))

# order: swap the input rows 0 and 1 and the outputs swap the same way
perm = [1, 0, 2, 3]
_, _, Y2 = head([Q[i] for i in perm], [K[i] for i in perm], [V[i] for i in perm])
print("permuted output is the permuted rows:",
      all(abs(a - b) < 1e-12 for r, i in zip(Y2, perm) for a, b in zip(r, Y[i])))
