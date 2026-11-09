# Ours, in the style of SmolML (no library): print the record, then the score.
import sys, random
SEED, K = 0, 5
rng = random.Random(SEED)

def make(label):                      # toy: class 1 sequences are richer in G
    p = "ACGT" if label == 0 else "ACGTG"
    return "".join(rng.choice(p) for _ in range(30))

rows = [(make(i % 2), i % 2) for i in range(200)]
def counts(s): return [s.count(c) / len(s) for c in "ACGT"]
X = [(counts(s), y) for s, y in rows]
rng.shuffle(X)
test, train = X[:50], X[50:]          # split first, tune nothing on test

def predict(x, k):
    near = sorted(train, key=lambda r: sum((a - b) ** 2 for a, b in zip(x, r[0])))[:k]
    return int(sum(y for _, y in near) * 2 > k)

def score(k):
    right = sum(predict(x, k) == y for x, y in test)
    return right, len(test)

print("python", sys.version.split()[0], "| seed", SEED)
print("train", len(train), "test", len(test), "| k", K)
r, n = score(K); print(f"accuracy {r} of {n} = {r / n:.3f}")
r, n = score(3); print(f"same run, k=3: {r} of {n} = {r / n:.3f}")
