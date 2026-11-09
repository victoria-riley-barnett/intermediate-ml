# Answers: Reporting a Result Another Person Can Check

1. Versions pin the software, the seed pins the random choices, the split counts pin how the data were divided, and the setting pins the one parameter that changes the result. The score is the output of those four, so it moves only when they do.
2. The score depends on the setting, so reporting one number without its setting hides which of two results the reader has. Print the setting with the score, and say how the setting was chosen.
3. For example: "On [N] held-out sequences, [x] were labelled correctly; always predicting the commonest family reaches [y]. We did not test whether the model identifies function or evolutionary relationship."
4. Report no detectable difference, because 0.81 to 0.83 lies inside 0.79 to 0.84. Seeds change the model's starting weights and example order on the same data, so they measure stability, not new samples from the world.
5. Say you do not know, that you cannot rule out leakage, and name the check: re-split by the grouping field and see whether the score drops.
