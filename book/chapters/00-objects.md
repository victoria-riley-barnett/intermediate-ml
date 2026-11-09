# Objects, and the shape of the work

The first week does not train anything that gets graded on accuracy. It settles two things every later week assumes: what a model is, and how a piece of work in this course is laid out. What follows in the course is a sequence of models, each one motivated by a limit in what came before it. None of that is legible without the layout and the vocabulary.

A model here means a function nobody hand-writes. Input goes in, a prediction comes out, and the behaviour comes from data rather than from a rule typed into the file. The contrast is weather. Weather is predictable in principle by writing the fluid-dynamics equations and solving them region by region; the equations were already known, and cost was the obstacle. A hydraulic model of San Francisco Bay and the Sacramento-San Joaquin delta, built in the 1950s, tested proposed changes to the waterways physically instead of numerically. It worked, it was expensive to build, and it answered for one region. Telling a cat photograph from a dog photograph out of raw pixels fails for a different reason. No step-by-step, exception-free procedure exists, and not because the rule is long: "cats are smaller" fails on small dogs, "pointy ears" fails on floppy-eared ones, and the knowledge that lets a person separate the two is not available in a writable form. Where the rule cannot be written down but a large set of examples can be supplied, each example carrying the correct answer, a model is the thing to reach for. The example is the input, the attached answer is its label, and a pile of them is labeled data.

The work itself is laid out in three parts, in an order that repeats. **Data**: what is actually there, what is missing, and what would let a model score well without learning the thing being asked of it. **Model**: what it can represent, and what it is structurally unable to see. **Evaluate**: whether it worked, for whom, and where it failed. A spam filter carries the whole loop. Its features are measurable properties of an email; its labels come from people who marked mail as spam or not, so any spam nobody reported is missing from the set; a feature like "was this moved to the spam folder" is the answer smuggled back in and will make a model look perfect until it meets an unsorted message; a model that counts trigger words is blind to spam written to avoid them. Its headline accuracy is uninformative while most mail is ordinary: a real email buried in the spam folder is a far more expensive error than a spam message that slips through. Those two errors, false positive and false negative, are named here and take the centre of the course's evaluation week.

Evaluation is where this week stops. The loop is named and not measured: no data is split, nothing is held out, no metric is computed on new examples. The half of the week that is carried out in full is objects. Every library the course leans on — pandas, PyTorch, Lightning — hands over objects, not loose functions plus data passed around by hand. The running examples are small: a bank account in the lecture, a `Counter` class and a `Wallet` the lab asks the reader to write, and a penguins table, which is a `DataFrame` and therefore an object with a state and a fixed set of operations permitted on it.

Both plates are about state. The first follows a short program as it replaces the values its names hold. The second sets a class beside the same two operations written as functions, and shows what the object form changes.


## A name holds one value at a time

[A name holds one value at a time](#fig-trace-state) draws a short program as a vertical spine: one line of Python per step down the left, and on the right every name the program can see, with the value that step wrote marked in the accent colour.

{{figure trace-state}}

Read the marks rather than the line numbers. Some steps bind a name for the first time; others write over a value an earlier step put there, and those are marked too. The loop test is evaluated before the writes it guards, and this is why the body runs once and not twice: by the time control returns to the test, the field being compared has already been replaced. The boxed print at the foot of the spine holds the consequence. It reports a total computed from the field's earlier value sitting beside that field's newest value, because the total was computed when the older value was still there. What the program prints is not a record of what happened, only what was true at the moment of printing.

A name holds one value at a time, and a program's history is not kept in its names. Two things follow for reading code. The value under a name at a given line is recoverable only by following the steps above it, so the order of the steps is part of the program and not an accident of presentation. And a notebook makes the point concrete: cells share state, a variable defined in one cell is available in a later cell, a restart and a run-all is the only way to know the current state is the state the page describes, and an out-of-order run produces a `NameError` from a line that looks correct. The lab's first check asks exactly this.

The plate draws only the names a reader wrote and the values they hold. It omits frames, references, opcodes and the dictionary's internal storage, which is the level at which this course reasons about state: what the data is, who may touch it, what it holds now.

## The count outlives the call that changed it

[The count outlives the call that changed it](#fig-code-object) sets the lab's `Counter` class beside a table of what its one attribute holds after each call, and, below a rule, writes the same two operations as plain functions that take a count and return a new one. The two call columns carry the same calls in the two forms; the table's last column gives the value before and after each call.

{{figure code-object}}

Two things to look at. First, every call finds the value the call above it left. Nothing is recomputed from nothing, and that persistence across calls is the property a model depends on later, when the parameters a module holds must survive each use. Second, the call site. The object form names the count nowhere; the function form names it at every call. Both columns reach identical values, so the class changes no arithmetic at all. What it changes is how many names the caller has to carry and pass along, and at fifty balances that is fifty variables, or a dictionary whose keys are passed hopefully to the right function, against fifty objects each holding its own. `object.method()` then reads as a sentence: the object before the dot supplies the state, the method after acts on exactly that state. `acct.deposit(50)` is "account, deposit 50 into yourself". Nothing in it is magic; Python finds the class, finds the method, and passes the object in automatically. The same reading carries a method nobody has met before: a `Series` holds one column of values, so a method called `value_counts` tallies how often each distinct value occurs. Reasoning from state to operation transfers; the method name does not.

The plate is narrow. It argues nothing about the class being the better answer, and it draws no inheritance and no visibility: `self.count` is a plain attribute that anything can read and write. Two hazards that belong to objects sit outside the plate. `df2 = df` does not make a second table, it gives one object a second name, so a write through either name shows through both; `.copy()` is what produces an independent one. And a method is the place where a rule about the state is enforced rather than hoped for, which is what `Wallet.withdraw` does when it raises `ValueError` for a balance that would go negative. A guard in a method is checkable; a guard in a comment is not.

## What you can now do

- Say what a model is in this course, and state the dividing line between writing the rule and supplying labeled examples of it being followed.
- Lay a problem out as data, model, evaluate, and ask the question each part carries: what is missing or leaking, what can this represent, for whom did it work.
- Name the state and the behaviour of a class, and read `object.method()` as an instruction addressed to the object's own data.
- Trace a short program step by step and say which step replaced a value rather than binding one for the first time, and what the printed output therefore does not record.
- Write a class that carries a value between calls and refuses the operation that would break a rule about it.

## What this does not give you

The loop is named here and not run. Nothing is held out, no metric is computed on examples the model has not seen, and the false-positive and false-negative asymmetry is stated without the table of counts that later gives it arithmetic. Evaluation as a subject arrives in week 5. Until then the three words are a checklist, and a reader who treats them as a result will overrate a model that never met a held-out example.

## Sources

None. Every figure in this chapter is derived from the delivered weeks and the course's own runs.

## Questions

1. **Notebook state.** After a restart and a run-all, does the `square` function work in the cell after the one that defined it? Why? What kind of run would raise `NameError` instead?
2. **Tables.** Load `diamonds` from seaborn. Plot a histogram of `price`, and report the mean price by `cut`. Which cut has the highest mean, and which the lowest?
3. **Shapes.** Without running it, what shape does a `(5, 3)` matrix times a `(3, 1)` matrix produce, and why? Verify the answer in NumPy.
4. **A class with a rule.** Write a `Wallet` class holding a balance, with `deposit(amount)` and `withdraw(amount)`. `withdraw` subtracts, and raises `ValueError` if the balance would go below zero. What does each of the two test cells report?

Answers belong in the back matter.

---

← [Architectures, and where each one came from](architectures.md)  ·  [What ML is, and what this course does with it](01-linear-analysis.md) →
