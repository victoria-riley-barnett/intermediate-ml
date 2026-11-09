# Strings -> ids -> padded slots, and why counts cannot see order.
# The tokenizer is adapted from SmolML's CharacterTokenizer (MIT):
# https://github.com/rodmarkun/SmolML/blob/main/smolml/preprocessing/tokenizers/tokenizers.py
class CharacterTokenizer:
    def fit(self, corpus):
        self.token_to_id = {"<pad>": 0}              # id 0 is reserved for padding
        for ch in sorted(set(corpus)):
            self.token_to_id[ch] = len(self.token_to_id)
        return self
    def transform(self, text):
        return [self.token_to_id[ch] for ch in text]

def pad(ids, t_max=12, side="right"):
    ids = ids[:t_max]                                # truncation: the tail is lost silently
    fill = [0] * (t_max - len(ids))
    return ids + fill if side == "right" else fill + ids

def counts(ids):                                     # many-to-one: position is dropped
    tally = {}
    for i in ids:
        tally[i] = tally.get(i, 0) + 1
    return tally

tok = CharacterTokenizer().fit("STx")
a, b = tok.transform("SxxT"), tok.transform("TxxS")
print("ids:", tok.token_to_id)
print("SxxT ->", a, " TxxS ->", b)
print("counts equal:", counts(a) == counts(b))
for side in ("right", "left"):
    print(side, pad(a, side=side))
print("same string, left vs right padding equal:", pad(a) == pad(a, side="left"))
long = tok.transform("S" + "x" * 12 + "T")             # 14 symbols
print("14-symbol string, T survives padding to 12:", 2 in pad(long))
