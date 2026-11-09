# Objects, and the shape of the work

The first week does not train anything that gets graded on accuracy. It settles two things every later week assumes: what a model is, and how a piece of work in this course is laid out. Each model in the course is introduced because of a limit in the one before it. You cannot see those limits without the layout and the vocabulary from this chapter.

A **model**, in this course, is a function nobody hand-writes. Input goes in and a prediction comes out. The behavior comes from data, not from a rule typed into a file. Weather shows the contrast. In principle you can predict weather by writing down the fluid-dynamics equations and solving them region by region. The equations were already known, and cost was the obstacle. In the 1950s, a hydraulic model of San Francisco Bay and the Sacramento-San Joaquin delta was built to test proposed changes to the waterways physically instead of numerically. It worked, but it was expensive to build and it answered for one region only.

Telling a cat photograph from a dog photograph, starting from raw pixels, fails for a different reason. No step-by-step procedure without exceptions exists, and the problem is not that the rule is long. "Cats are smaller" fails on small dogs. "Pointy ears" fails because some dogs have them too. The knowledge that lets a person separate the two is not available in a form that can be written down. When you cannot write the rule but you can supply many examples, each carrying the correct answer, a model is the right tool. The example is the **input**, the attached answer is its **label**, and a pile of such pairs is **labeled data**.

> **On the timeline.** This chapter inherits no row of the architectures timeline: it is the shape of all the work that the later chapters share, which is data, then model, then evaluate. What it adds is the vocabulary and one habit of code, the object that holds state. Every model in the course is an object of this kind. See [the architectures chapter](architectures.md) for the timeline itself.

## Every problem has three parts

The work in this course is laid out in three parts, in an order that repeats. **Data** asks what is actually there, what is missing, and what would let a model score well without learning the thing we care about. **Model** asks what it can represent and what it cannot see. **Evaluate** asks whether it worked, for whom, and where it failed.

A spam filter carries the whole loop. Its **features** are measurable properties of an email, such as the number of exclamation points. Its labels come from people who marked mail as spam or not. That means any spam nobody reported is missing from the data. A feature such as "was this moved to the spam folder" is the answer smuggled back in. A model that uses it will look perfect until it meets an unsorted message. This failure is called **leakage**, and it is worth checking for whenever a model looks suspiciously good.

The model part has its own limit. A model that counts trigger words is blind to spam written to avoid them. The range of patterns a model can represent, however much data it sees, is its **capacity**.

The evaluate part has an asymmetry. A headline accuracy tells you little while most mail is ordinary: a filter that calls everything "not spam" is right most of the time and catches nothing. A real email buried in the spam folder is a far more expensive error than a spam message that slips through. The first error is a **false positive** and the second is a **false negative**. They are named here and become the center of [the evaluation chapter](05-evaluation.md).

This chapter stops there. The loop is named and not measured. No data is split, nothing is held out, and no metric is computed on new examples. The part of this week carried out in full is objects. Every library the course leans on, including pandas, PyTorch and Lightning, hands you objects and not loose functions with data passed around by hand. The running examples are small. The lecture uses a bank account. The lab asks you to write a `Counter` class and a `Wallet` class. A penguins table is a pandas `DataFrame`, which is an object with a state and a fixed set of operations allowed on it.

The two plates below are both about state. The first follows a short program as it replaces the values its names hold. The second sets a class beside the same two operations written as plain functions.

## A name holds one value at a time

The first plate, [A name holds one value at a time](#fig-trace-state), draws a short program as a vertical spine. Each step is one line of Python, down the left. On the right are the names the program can see, with the value that step wrote marked in the accent color.

{{figure trace-state}}

Read the marks, not the line numbers. The program runs seven steps and writes six values. Three of those writes are first bindings: the whole record at step 1 and the total at step 2. Three replace a value that was already there: the total goes from 0 to 12, the field `rec['n']` goes from 12 to 7, and the field `rec['state']` goes from `'ok'` to `'low'`.

The loop test is evaluated before the writes it guards. This is why the body runs once and not twice. When control returns to the test at step 6, the field being compared has already been replaced, so the test is now false.

The boxed print at the foot of the spine holds the consequence. It prints `{'n': 7, 'state': 'low'} 12`. The total, 12, was computed when the older value of `rec['n']` was still in place. The print shows the latest values, and it shows nothing about the six steps before the last. What a program prints is not a record of what happened. It is only what was true at the moment of printing.

A name holds one value at a time, and a program's history is not kept in its names. Two things follow for reading code. First, the value under a name at a given line can be recovered only by following the steps above it, so the order of the steps is part of the program. Second, notebooks make this concrete. The cells of a notebook share state, so a variable defined in one cell is available in a later cell. A restart followed by a run-all is the only way to know that the current state matches the page. An out-of-order run can raise a `NameError` from a line that looks correct. The lab's first check asks exactly this.

The plate draws only what you can see: the names you wrote and the values they hold. It leaves out frames, references and the internal storage of the dictionary. That is the level at which this course reasons about state: what the data is, who may touch it, and what it holds now.

## The count outlives the call that changed it

The second plate, [The count outlives the call that changed it](#fig-code-object), sets the lab's `Counter` class beside a table of what its one attribute holds after each call. Below a rule, it writes the same two operations as plain functions that take a count and return a new one.

{{figure code-object}}

The table has four rows: the line that creates the count, then three calls. The count after each is 0, then 1, 2, and 0. Both columns, the object form and the function form, give the same three counts.

There are two things to look at. First, every call finds the value that the call above it left. Nothing is recomputed from nothing. This persistence across calls is what a model depends on later, when the parameters a model holds must survive each use.

Second, look at the call site. With the object, the call names the count 0 times. With the functions, the call names it twice, once to pass it in and once to catch the result. The class changes no arithmetic. It changes how many names the caller has to carry. With fifty balances, that is fifty variables, or a dictionary whose keys you must pass to the right function. With objects, it is fifty objects, each holding its own.

This is also why `object.method()` reads as a sentence. The object before the dot supplies the state, and the method after the dot acts on exactly that state. `acct.deposit(50)` means "account, deposit 50 into yourself." Nothing here is magic. Python finds the class, finds the method, and passes the object in automatically.

The same reading works on a method you have never met. A `Series` holds one column of values, so a method called `value_counts` tallies how often each distinct value occurs. What transfers is reasoning from the state to the operation, not the method name.

The plate is narrow on purpose. It does not argue that the class is the better answer. It draws no inheritance and no visibility, and `self.count` is a plain attribute that anything can read and write.

Two hazards that belong to objects sit outside the plate. The first is `df2 = df`. This does not make a second table. It gives one object a second name, so a write through either name shows through both. The method `.copy()` is what produces an independent table. The second is that a method is the place where a rule about the state can be enforced instead of hoped for. This is what `Wallet.withdraw` does when it raises `ValueError` for a balance that would go negative. A guard in a method can be checked. A guard in a comment cannot.

## By hand, in pure Python

The code below is ours, written in the style of SmolML. It is adapted in spirit from SmolML's [`smolml/core/value.py`](https://github.com/rodmarkun/SmolML/blob/main/smolml/core/value.py) (a number that remembers how it was made) and [`smolml/models/nn/layer.py`](https://github.com/rodmarkun/SmolML/blob/main/smolml/models/nn/layer.py) (a `DenseLayer` that holds its own weights), both MIT. We have cut both down to the bare idea: each class holds state, and each has methods that act on that state. The file is `book/code/00-objects/state.py`.

```python
class Value:
    def __init__(self, data, parents=()):
        self.data = data                 # state: the number itself
        self.parents = parents           # state: the values it was made from

    def __add__(self, other):            # behaviour: build a new Value
        return Value(self.data + other.data, (self, other))

    def __mul__(self, other):
        return Value(self.data * other.data, (self, other))


class DenseLayer:
    def __init__(self, weights, bias):
        self.weights = weights           # state: one weight per input
        self.bias = bias                 # state: one constant

    def forward(self, x):                # behaviour: weighted sum plus constant
        total = self.bias
        for w, xi in zip(self.weights, x):
            total += w * xi
        return total


a, b = Value(2.0), Value(3.0)
c = a * b + Value(1.0)
print("c.data =", c.data, "| made from", [p.data for p in c.parents])

layer = DenseLayer([0.5, -1.0], 0.25)
print("forward([4, 1]) =", layer.forward([4.0, 1.0]))
layer.weights[0] = 1.5                   # change the state ...
print("forward([4, 1]) =", layer.forward([4.0, 1.0]))   # ... same call, new answer

alias = layer                            # a second name, not a second layer
alias.bias = 0.0
print("layer.bias =", layer.bias)
```

Running it with plain `python3` prints:

```
c.data = 7.0 | made from [6.0, 1.0]
forward([4, 1]) = 1.25
forward([4, 1]) = 5.25
layer.bias = 0.0
```

Check the numbers by hand. The value `c` is 2 times 3, plus 1, which is 7. It remembers the two values it was made from, 6 and 1. The first `forward` call computes 0.5 times 4, plus -1 times 1, plus 0.25, which is 1.25. After we change one weight to 1.5, the same call gives 1.5 times 4, minus 1, plus 0.25, which is 5.25. The call is unchanged and the answer moved, because the layer's state moved. The last lines show the hazard from the plate: `alias` and `layer` are one object, so setting the bias through one name shows through the other.

A neural-network layer is nothing more than this. Its weights are its state, and `forward` is its behavior. The chapters that build models will keep this shape.

## The same thing in PyTorch

The course path through PyTorch is a chain of objects: a `Dataset` holds the examples, a `DataLoader` hands them out in batches, an `nn.Module` holds the parameters and makes a prediction, and a metric scores that prediction. This chapter reaches only the `nn.Module` link, and only in outline. Here is the `DenseLayer` above, written the PyTorch way. We cannot run it in this book's sandbox, so no output is shown.

```python
import torch
from torch import nn

class DenseLayer(nn.Module):
    def __init__(self, n_in, n_out):
        super().__init__()
        self.weights = nn.Parameter(torch.randn(n_in, n_out))   # state
        self.bias = nn.Parameter(torch.zeros(n_out))            # state

    def forward(self, x):                                       # behavior
        return x @ self.weights + self.bias
```

The class has the same two parts as ours. The `nn.Parameter` wrapper marks a tensor as state that should be learned, and `model.parameters()` hands that state over. You never reach in and rewire it by hand. You ask the object through the methods it exposes.

The same contract appears at three scales. A thermostat has a current and a target temperature as state, with `set_target()` and `read_current()` as behavior. A pandas `DataFrame` has a table as state, with `.dropna()`, `.groupby()` and `.mean()` as behavior. A PyTorch model has parameters as state, with `.forward()` and `.parameters()` as behavior.

## What the run shows

This week has no trained model, so there is no measured result about accuracy. What the runs show is mechanical, and you can check each by hand:

- In the traced program, six values are written in seven steps, and three of the writes replace an existing value.
- In the `Counter` table, the count after each step is 0, 1, 2, 0, in both the object form and the function form.
- In the code above, one changed weight moves the same `forward` call from 1.25 to 5.25.

## What you can now do

- Say what a model is in this course, and state the dividing line between writing the rule and supplying labeled examples of it being followed.
- Lay a problem out as data, model and evaluate, and ask the question each part carries: what is missing or leaking, what can this represent, and for whom did it work.
- Name the state and the behavior of a class, and read `object.method()` as an instruction addressed to the object's own data.
- Trace a short program step by step, and say which step replaced a value and which bound it for the first time.
- Write a class that carries a value between calls and refuses the operation that would break a rule about it.

## What is still missing

- The loop is named and not run. Nothing is held out, and no metric is computed on examples the model has not seen. [The evaluation chapter](05-evaluation.md) takes this up.
- The false-positive and false-negative asymmetry is stated without the table of counts that gives it arithmetic. That table is also in [the evaluation chapter](05-evaluation.md).
- A model's parameters are only held here, never changed by learning. [The linear chapter](01-linear-analysis.md) fits the first model, and [the autodifferentiation chapter](02-autodifferentiation.md) shows how the changes are computed.
- Until then, the three words data, model and evaluate are a checklist. A reader who treats them as a result will overrate a model that never met a held-out example.

## Questions

1. **Notebook state.** After a restart and a run-all, does the `square` function work in the cell after the one that defined it? Why? What kind of run would raise `NameError` instead?
2. **Tables.** Load `diamonds` from seaborn. Plot a histogram of `price`, and report the mean price by `cut`. Which cut has the highest mean, and which the lowest?
3. **Shapes.** Without running it, what shape does a `(5, 3)` matrix times a `(3, 1)` matrix produce, and why? Verify the answer in NumPy.
4. **A class with a rule.** Write a `Wallet` class holding a balance, with `deposit(amount)` and `withdraw(amount)`. `withdraw` subtracts, and raises `ValueError` if the balance would go below zero. What does each of the two test cells report?
5. **Two names.** After `a = [1, 2, 3]` and `b = a`, you run `b.append(4)`. What does `a` hold, and why? What one change to the second line would keep `a` unchanged?

Answers belong in the back matter.
