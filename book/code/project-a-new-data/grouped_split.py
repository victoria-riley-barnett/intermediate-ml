# Ours, in the style of SmolML (no library): the two checks a project starts with.
import random
rng = random.Random(0)

# Toy data. 12 groups (think: accessions), 3 sequences each, 10 items long.
# The label is 1 when "GT" sits at positions 4-5, so position carries the label.
data = []
for g in range(12):
    base = "".join(rng.choice("ACGT") for _ in range(10))
    for _ in range(3):
        s = list(base)
        s[rng.randrange(10)] = rng.choice("ACGT")     # members of a group are near-copies
        s = "".join(s)
        data.append((f"g{g}", s, int(s[4:6] == "GT")))

# Check 1: two sequences with the same items in a different order and different labels.
pair = next(((a, b) for a in data for b in data
             if sorted(a[1]) == sorted(b[1]) and a[2] != b[2]), None)
print("order pair:", pair)

def overlap(train, test):
    return len({r[0] for r in train} & {r[0] for r in test})

# Check 2: split by row, then split by group, and print the overlap each time.
rows = data[:]; rng.shuffle(rows)
print("row split   :", overlap(rows[:27], rows[27:]), "groups on both sides")
groups = sorted({r[0] for r in data}); rng.shuffle(groups)
test_g = set(groups[:3])
train = [r for r in data if r[0] not in test_g]
test = [r for r in data if r[0] in test_g]
print("group split :", overlap(train, test), "groups on both sides")
print("labels train:", sum(r[2] for r in train), "of", len(train))
print("labels test :", sum(r[2] for r in test), "of", len(test))
