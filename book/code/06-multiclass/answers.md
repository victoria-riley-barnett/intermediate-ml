# Answers: Multiclass and softmax

1. Question 1 is graded from the student's own run: the baseline is the accuracy of naming the largest training family for every gene (around three in ten on human). The comparison and the per-family dog recall come from the lab's printed tables.
2. Question 2 is graded from the student's own `predict_proba` output. A full answer gives both probabilities and names a concrete reason the case is hard, such as two families whose sequences echo each other (tyrosine kinase and tyrosine phosphatase) or the GPCR and ion-channel overlap in the lecture example.
3. Question 3 is graded from the student's comparison table and loss plot. The answer must name one model and cite the dog column and the loss curves for it.
4. Question 4 is graded from the student's `k = 5, 6, 7` search. A full answer says which accuracies moved, and proposes a next run (for example a finer search or a different `alpha`).
5. 300 - 6 + 1 = 295 windows. The count vector has 4^6 = 4,096 columns, whatever the length.
6. The decision is the same for both, but the loss on the true family differs: -log 0.97 is about 0.03, and -log 0.40 is about 0.92. The loss reads the distribution and shows that only the first call is confident.
