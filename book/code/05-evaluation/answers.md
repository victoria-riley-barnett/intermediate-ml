# Answers: chapter 5, Evaluation

1. Recall. Its denominator is TP + FN = 5, the rows that are truly positive: the 4 found plus the 1 missed.
2. Recall. Accuracy on the do-nothing rule is high only because most rows are healthy. Recall is TP / (TP + FN) = 0 / (the diseased rows) = 0.
3. TP 16, FN 4, FP 41, TN 139. Recall rose (0.150 to 0.800). Precision fell (0.600 to 0.281). Accuracy also fell (0.905 to 0.775).
4. The false negatives (FN). Lower the cutoff, so a row needs less evidence to be flagged. Recall rises and precision falls. The assumption is that the missed case really costs more, which is a judgement about the problem.
5. The 750 held-back rows belong in the report, because no parameter was moved on them. Shrink the training set (the lab uses 25 rows) and the model can memorise its training rows: the training accuracy climbs while the held-back accuracy falls, so the training number becomes visibly misleading.
