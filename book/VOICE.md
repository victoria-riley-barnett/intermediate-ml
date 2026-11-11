# Voice sheet

The author writes plainly, in order, from a small concrete case. Her weeks 2, 5, 7 and 8
are the model. (Weeks 10 to 12 drift toward dense, technical paragraphs; use them for
content, not for register.) Sentences below are verbatim except for class-time words.

## 1. Her sentences

**Introducing a term**
1. A model is a rule with blanks in it. (02_autodiff_lecture.ipynb, Week 2 lecture)
2. A **feature** is an input measurement, supplied by the data. (02_autodiff_lecture, Weights, biases, parameters)
3. The **loss** is one number rating how badly a model fits, smaller being better. (02_autodiff_lecture, Squaring)
4. A tensor is not a new kind of object. It is a grid with a rank, and the rank says how many indices you need to point at one number. (week05 lecture, The same numbers, at four depths)
5. Fitting the accidents of one sample as if they were the pattern is **overfitting**. (week07 lecture, A model can fit without learning the pattern)
6. The pad is a symbol like any other. (week08 lecture, Padding gives a batch one shape)
7. A **mask** is a second input, one flag per slot, marking which slots hold a real symbol. (week08, Padding gives a batch one shape)
8. `std` is the standard deviation, how far the numbers spread around the mean: wide `std`, wide spread; narrow `std`, tight cluster. (00_foundations.ipynb, A table)
9. The width of a layer is a column count. (modelinglab.ipynb, A layer is one matrix multiply)

**Setting up an example**
10. Start with a case small enough to check by hand. (week07, A model can fit without learning the pattern)
11. Four calibration standards give these readings: (week07, same)
12. Take a 200 mm flipper. (02_autodiff_lecture, Why the intercept is negative)
13. A gene belongs to exactly one family. (week06 lecture, opening)
14. Every row is a real DNA sequence from the human genome: a string of `A`, `C`, `G`, `T`, labeled with which of **seven gene families** it belongs to. (week06, The gene family data)
15. A chemist validating an assay does the same: tune the cutoff on development samples, then run the blinded samples once. (week07, The split gives each set one job)
16. Because we built the data, we know the line it came from: `w_true = 3` and `b_true = 7`, with random noise added on top. (week02 lab, The data)

**Stating a limitation**
17. This does not mean a simpler model always wins. (week07, A model can fit without learning the pattern)
18. A parameter can be necessary and still mean nothing on its own. (02_autodiff_lecture, Why the intercept is negative)
19. Two points can only ever agree with two points. (02_autodiff_lecture, Two points is not a fit)
20. A measure that lets errors cancel is not measuring error. (02_autodiff_lecture, Adding them fails)
21. The question is then unanswerable, and nothing raises an error. (week08, Padding gives a batch one shape)
22. A run like this is harder to catch than the exploding one, because nothing about it looks broken. (week02 lab, The learning rate)

**Admitting what is not known**
23. There is no formula that produces the right learning rate. (week02 lab, The learning rate)
24. The honest procedure is to try a value, look at the loss curve, and adjust. (week02 lab, The learning rate)
25. Not a value you can calculate: it depends on the scale of your inputs and the size of your model. (week05, The learning rate)
26. Matching chimp and dog sequences exist too, and are saved for a later week's question: does a model trained on one species generalize to another. (week06, The gene family data)
27. The numbers in a learned vector are not automatically named chemical measurements. (week09 lecture, opening)

**Turning a corner**
28. But a calibration curve exists to predict samples we have not measured yet. (week07, A model can fit without learning the pattern)
29. The curve that fit the standards best was the worst at the job we wanted it for. (week07, same)
30. The flat line scores as nearly perfect and the useful model scores worse. (02_autodiff_lecture, Adding them fails)
31. The loss does not decrease. It grows by a factor of about six on every step. (week02 lab, The learning rate)
32. The flattening is the run reporting that it has arrived. (week02 lab, One step, and then many)
33. One model gives two very different answers to “how good is it?”, and only the second answer is about new data. (week07, In the gene data)

**Closing a section**
34. One axis is always the example. The rest are whatever the model is looking at. (week05, The same numbers, at four depths)
35. **`.reshape` never changes the numbers. It changes how many indices you need to reach them.** (week05, The same numbers in code)
36. The same string padded on the other side is a different input, and for a model whose weights are tied to slot numbers it is as different as a different string. (week08, Padding gives a batch one shape)
37. Two knobs, two jobs. (02_autodiff_lecture, Weights, biases, parameters)

## 2. Her habits

- **Short declaratives, one idea each, with an occasional long one that carries a "because".** "The loss does not decrease. It grows by a factor of about six on every step." Then a sentence that explains the mechanism at length.
- **"We" for things done together, "you" for what the reader will see or do.** "We fit two curves to them and ask which one to trust." / "Read it the way you read any stack." Never "one" or "the reader".
- **A named concrete case first, the term after it.** Penguins (flipper mm, mass kg), y = 3x + 7 plus noise, calibration standards, a gene's 5-mers and seven families, the strings S/x/T with a pad. A paragraph marked "In the gene data" returns to the running example.
- **Units and plain-language readings of numbers.** A weight "reads as a sentence once you know the units". A number is given with what it is: "loss ... 0.87", "from 35.77 to 5.33 in a single step". Small numbers are given exactly, never "roughly several".
- **What goes first: the thing itself, then why you would want it.** Definition in one sentence, then the example, then what it does not cover.
- **Bold only on a term at its first definition, or on the one sentence to remember.** Not for emphasis in running prose.
- **Ends a section on the consequence or the next step, flat.** "The next section sets that up." / "Two knobs, two jobs." No summary paragraph.
- **Says plainly when something fails or is unknown**, and what to do about it ("Lower the learning rate first").

## 3. What she never does

She does not use: "delve", "crucial", "key", "robust", "leverage", "landscape", "powerful", "seamless", "dive into", "it is important to note", "In summary", "In conclusion", "Let's explore", "Imagine", "game changer".
She does not: open with a rhetorical question; list three adjectives or three examples for rhythm; chain em-dashes (she uses colons and commas; a dash is rare); use "not X but Y" or "it's not about X, it's about Y" flourishes; hedge with "might perhaps", "somewhat", "arguably", "tends to"; cheer ("Great!", "Exciting", "Amazing"); address the reader's feelings; end with a moral or a call to action; add a sentence that restates the last one.
Model habits to strip: tidy symmetrical sentence pairs, a metaphor per paragraph, "serves as", "plays a role", stacked qualifiers, a closing line that sounds like a poster.

## 4. Do / don't for a page here

Do: name the thing and say what it is in one plain sentence. Put one small example with real numbers next. Say what a symbol stands for in words before it appears. Introduce the plate in the sentence before it. Put proofs, exact digits and edge cases in the margin. Use the examples that are in the sources. End when the idea is finished.
Don't: use class-time words (this week, lab, homework, your turn). Invent a number, a date or a history. Use two examples where one will do. Explain the maths before the idea. Write more than the page needs; a stub with one honest sentence beats padding.

## 5. Two paragraphs written to the sheet

**The learning rate.** Draws on week02 lab.md ("The learning rate": the 0.01 and 0.05 runs, "a factor of about six", "There is no formula...", "The honest procedure...") and week05 lecture.md ("The learning rate": the gradient says which way, the rate says how far).

> Training moves a model's numbers a little at a time, and the learning rate is the size of each move. At every step the gradient says which way to go and how steep the ground is. It does not say how far to go. The learning rate does: it is the fraction of the gradient the model actually applies. Take points scattered around the line y = 3x + 7 and start the fit somewhere wrong. At a rate of 0.01 the loss falls steeply and then flattens, which is the run reporting that it has arrived. At 0.05 each step overshoots the bottom and lands higher up the other side, and the loss grows by a factor of about six on every step. There is no formula for the right rate. You try one, look at the loss curve, and adjust.

**Padding.** Draws on week08 lecture.md ("Padding gives a batch one shape": length twelve, "The pad is a symbol like any other", the mask, `SxxxxxxxxxxxxT`).

> Strings come in different lengths, and a model takes a batch as one array, so the shorter strings are filled up with a pad symbol until every string is the same length. Here that length is twelve. The pad is a symbol like any other. It goes through the same weights as S and T, so the model can see it, and how many pads a string carries and where they sit is a fact the model can read. The same string padded on the other side is a different input. The pads also have to be marked with a mask, so the model can tell a real symbol from a pad. And a string longer than twelve loses its tail: SxxxxxxxxxxxxT arrives as Sxxxxxxxxxxx, without its T, and nothing raises an error.
