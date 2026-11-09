# Answers: Giving tokens meaningful numbers

1. No. An id is an address into the table: its position in a fixed alphabet. It carries no mass, charge or size, so 9 and 7 being near each other says nothing about leucine and isoleucine. Any closeness between their rows would have to be learned from the prediction task.
2. The reversed ids are `[5, 8, 2, 17, 9, 0]`. The pooled vector is unchanged, because it adds each column and divides by 6 and addition has no order. The scores and probabilities are therefore unchanged too (the pure-Python example prints `True` for this check).
3. The dot product is 1(2) + 0(2) = 2. The lengths are 1 and sqrt(8), about 2.828. The cosine similarity is 2 / 2.828, about 0.707, and the cosine distance is 1 - 0.707, about 0.293. With `[0, 0]` the length is 0, so the division is by zero and the similarity is undefined.
4. The table holds 20 x 8 = 160 numbers. The head holds 8 x 20 = 160 weights plus 20 biases, 180. Together 340.
5. On the eight-coordinate view. That is the space the model computes in. The two-coordinate ordering is a property of the picture, since B's large third coordinate is hidden there. Over all eight, cos(A, B) is 0.2194 and cos(A, C) is 0.9701, so C is nearer.
