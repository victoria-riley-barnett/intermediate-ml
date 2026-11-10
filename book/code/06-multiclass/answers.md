# Answers: Multiclass and softmax

**Q1.** 300 - 6 + 1 = 295 windows. The count vector has 4^6 = 4,096 columns, whatever the length.

**Q2.** The decision is the same for both, but the loss on the true family differs: -log 0.97 is about 0.03, and -log 0.40 is about 0.92. The loss reads the distribution and shows that only the first call is confident.

**Q3.** The largest score is 2.0 at index 0, so argmax picks GPCR. Softmax keeps how large each score is relative to the others: it gives 0.37 to GPCR and 0.30 to ion channel, the true family, which argmax discards.

**Q4.** Squared error's slope shrinks as q_c goes to 0, exactly where the model is most wrong, so a confidently wrong model barely moves. Cross-entropy's slope grows there, so the more wrong and sure the model is, the harder training pushes.
