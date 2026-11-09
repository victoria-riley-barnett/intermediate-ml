# Architectures, and where each one came from

Eleven plates were drawn for one day of this course. The first three are a timeline from 1943 to 2022. The rest each draw one member of a single family of models, small enough that you can check the numbers by hand. Read in order, they make one claim about where new work in machine learning has gone.

A network has two parts that can change. The **block** is the arrangement inside it: which weights exist, how many of them are reused at different positions, and what operations sit between them. The **input** is what the first layer is handed: its shape, its width, and how many examples of it exist. Each era of the field put its new work on one of these two, and the timeline lets you see which.

## How to read this book

Each later chapter in this book stands on one row of the timeline. When you reach a chapter, ask two questions. What did the block gain that the last chapter's block lacked? And what is the input, now that the model sees it differently? Every section below ends with one line naming the chapter that picks that era up, so you can come back to this page as a map. You do not need to understand every plate on a first read. Skim the timeline now, and return to a plate when its chapter arrives.

The running example is a stack that reads a grid of numbers and returns a fixed-width vector of scores. By the last plate, it is an encoder reading a protein as a sequence of residue ids. Each member is drawn at a size you can follow: one image patch, four positions, one head. This chapter is a map, not a step. It does not train anything. It is the ground the last chapters stand on: what a fixed-size input cannot learn, and what a mixing operation over positions does instead.

## The first years change the unit, not the input

[The lineage to 1997](#fig-lineage-a-1943-1997) has seven rows. The domain column moves from neurophysiology to perception, mathematics, vision and sequences, while the question stays the same: what can one small unit compute, and how can a network of them be made to learn?

{{figure lineage-a-1943-1997}}

In 1943 McCulloch and Pitts described a unit that counts how many of its inputs are on and fires when the count reaches a number. The count and the wiring were set by hand, never fitted. Chapter 1 starts from the next step, a unit that weights its inputs and adds them up.

In 1958 Rosenblatt added learning. After each wrong answer, a weight moves by the error times that weight's own input. This rule settles only if one straight cut separates the two groups. Chapter 2 builds this update rule by hand.

The 1969 row is often read as a verdict that extra layers are useless. It says something narrower. No single flat cut separates the four cases of XOR (the cases where exactly one of two inputs is on), and two cuts do. So a second layer of units would be enough, but the learning rule of the time did not say how to set the weights of that second layer. Others did work on this. Amari published a multilayer pattern classifier trained by stochastic gradient in 1967, so it is not true that nothing could be done. Chapter 4 builds the hidden layer that XOR needs.

The 1986 row is backpropagation, the procedure for computing how much each weight in every layer contributed to the error, at about the cost of one more forward pass. The 1986 paper by Rumelhart, Hinton and Williams made it widely used. The underlying method, reverse-mode differentiation, had been published by Linnainmaa in 1970 and applied to networks by Werbos in 1974. Chapter 3 builds backpropagation step by step.

Two other rows belong to the same period. In the 1980s one weight set reused at every position gave the convolutional network, which chapter 10 covers. In 1997 the LSTM (long short-term memory) added a cell state that is added to rather than overwritten, so the gradient flows through sums instead of through a product of matrices. Chapter 8 returns to recurrence and the LSTM.

All seven rows are marked IDEA, a new mechanism. None of them changes the input.

## Fifteen years bring few new architectures, and three pieces arrive from outside

[The quiet years](#fig-quiet-years) are three lanes over one span, 1994 to 2012. The architecture lane is nearly empty between LSTM in 1997 and AlexNet in 2012. It holds a single hollow mark: pretraining in 2006, an idea that was too small to scale at the time. The middle lane shows what the field taught instead: support vector machines in 1995, boosting in 1997 and random forests in 2001, all of which put hand-built features in front of a simple model. The bottom lane shows what arrived from other fields: CUDA in 2007, on hardware that video games had paid for, and ImageNet in 2009, a labelled set assembled by crowdsourcing.

{{figure quiet-years}}

Neither arrival is an idea about a block. Both concern the input, and the middle lane is input work too, since hand-built features are a way of preparing the input. For fifteen years the block barely moved. The plate marks the end of the span at 2012, where the top-5 error was 15.3 percent against a next best of 26.2 percent.

During these years the field also learned how to judge a model on data it had not seen. That habit, which decides whether any of the numbers on this timeline mean something, is the subject of chapter 5, where we build held-out benchmarks.

## From 2012 the timeline separates new mechanisms from new inputs

The KIND column is the tool to use here. IDEA marks a new mechanism. APPLICATION marks existing mechanisms spent on a changed input. [The timeline from 2012](#fig-lineage-b-2012-2022) has exactly two APPLICATION rows.

{{figure lineage-b-2012-2022}}

The first is 2012, AlexNet. Its own row says it trains the same layers on far more data and compute, with no new mathematics. It had 60 million weights and ran for five days on two 3 GB GPUs. This is the memorising that paid: with enough labelled examples, a very large network that fits its training set closely still did well on new images. Chapter 7 asks when that works and when it does not.

The second is 2020, AlphaFold 2. It uses attention over an alignment (one protein set beside many relatives) to predict the fold. The attention is the 2017 row's. What changed is the input. We should be careful here: the plate states this as a summary of one change, and the AlphaFold paper describes more machinery than attention alone. Chapter 12 builds the encoder that this application spends.

Between these two rows the IDEA rows add mechanisms. In 2013, word2vec gave each word a vector fitted to predict nearby words, a change that helps make the input as well as the block. Chapter 9 builds token vectors. In 2014 sequence-to-sequence models with attention scored every encoder state to produce a new summary per output word, which chapter 11 covers. The 2015 ResNet added a shortcut wire so that a block learns a correction to its own input, at the cost of one addition. And in 2017 the transformer let every position compare against every position, so doubling the input length quadruples the work and memory. Chapters 11 and 12 take up attention and the transformer; the residual shortcut is part of the encoder block in chapter 12.

The plate runs on past 2020. Its later rows (compute budgets, preference tuning) and its open column name work this course does not cover, and nothing here depends on them.

## A feed-forward stack has one shape and no order

[The feed-forward plate](#fig-feedforward) is the block at its plainest. It has three fitted layers, and a softmax at the end that is an operation, not a layer. The input is one row of 512 numbers, and the output is 10 scores. The weight matrices are 512 by 256, 256 by 256 and 256 by 10.

{{figure feedforward}}

White boxes own weights that training fits. Grey boxes own none. That one row is all the network can see: it has no notion of order, no length and no repetition. Every other plate in the family is a decision about data that this one cannot represent, paid for in parameters, in work, or in information lost. Chapter 4 builds this stack, and chapter 6 adds the softmax head.

## One filter at every position pays for reach with a fixed window

[The convolutional plate](#fig-convolutional) changes the block in one place: one set of weights is reused at every position. A filter slid across the grid finds a pattern wherever it occurs, for the weights of a single detector. That claims a local pattern means the same thing wherever it sits, which is what a biological motif licenses.

{{figure convolutional}}

The window is fixed. A wider pattern needs another layer or a wider kernel, and the number of layers needed depends on the longest distance in the data, which nothing in the layer knows. At the border some inputs are missing, so the output there is undefined rather than zero, and padding is what fills the gap. After the flatten step, position is gone, and the next layer reads cell order as arbitrary. Chapter 10 builds the convolution.

## One window, nine products, one number, and no value at the border

[One convolution position](#fig-eq-conv-window) is the arithmetic you can check code against. A 3 by 3 filter sits on a 5 by 5 image. The window holds the values 1 to 9 and the filter is 1, 0, -1 on each of its three rows. Each row gives 1 times 1 plus 0 times 2 plus -1 times 3, which is -2, so the three rows together give -6.

{{figure eq-conv-window}}

The same nine weights are reused when the window shifts one cell to the right. At the edge, either the window fits inside the image or it does not. Where it does not, the value is undefined, not zero. A zero could be learned around. An undefined position is a gap the modeller has to close. Chapter 10 uses this same arithmetic.

## A recurrent cell carries a state and gives up parallel steps

[The recurrent plate](#fig-recurrent) applies one small network at every step. The previous step's state is an extra input, and the same three weight matrices are used each time, so a longer input costs no extra parameters.

{{figure recurrent}}

This buys reach that the convolution lacks, because positions reach each other through the state. It charges twice. The steps are sequential, so they cannot run at the same time. And the gradient that reaches the first step has passed through one product of the recurrent weight per step. The 1997 row replaces that product with a sum. These are one failure seen from two sides. Chapter 8 builds the recurrent reader and compares it with simpler ones.

## When the target is the input, no label enters the loss

[The autoencoder](#fig-autoencoder) changes neither the block nor the input. It changes the target. The input goes in, comes back out at its own width, and the loss compares the two. The code in the middle is only 64 numbers wide, against 512 at each end.

{{figure autoencoder}}

That narrow code is the decision. An encoder that must return a wide input through a narrow code has to select what to keep, and the decoder trains beside it, so the pair settle on a code that is useful to the two of them. A low reconstruction error says the code redraws the input roughly. It says nothing about whether the code carries what a label would be about. No later chapter builds an autoencoder. It is here to show that the target is a third thing that can change.

## Each position's output is a weighted average over every position

[One attention head](#fig-attention-worked) changes the block into an operation that is dense in its input. Each position's output is a weighted average of every position's value. The weights come from scoring that position's query against every key.

{{figure attention-worked}}

Every row of weights sums to one, so an output cannot exceed the largest value it mixes. The scores are divided by the square root of the head width, which keeps a softmax soft as the width grows. The map is dense: the scores grow with the square of the length, so all positions are computed at once. The recurrent plate's price in steps becomes a price in work and memory. The plate carries no notion of where a position sits: reorder the positions and every mixture reorders. Chapter 11 builds one head by hand.

## The block stacks because its input and output shapes agree

[The encoder block](#fig-encoder-block) joins attention to a feed-forward layer, with something neither had on its own. Each sits inside a residual branch, so the stream carries what arrived plus a correction learned on it, with a normalisation at the start of the branch.

{{figure encoder-block}}

The shapes are the reason it can repeat. Input and output agree: attention mixes without changing the width, and the feed-forward layer widens and then returns. What the block cannot do alone shows in what it does not change. Attention is blind to order, so order must arrive from outside, and nothing in the block looks past the sequence it is handed. That is why the set of plates ends at an encoder. Chapter 12 builds the full encoder.

## The composite prints the whole family in one checkable format

[The composite](../figures/architecture-day.html) shows the eleven plates at drawing size. Its value is the repetition: constants in the header, each operation as an equation, a listing in code, and a glossary of symbols. An architecture that fits on one page can be checked, because a shape that disagrees with the code means one of the two is wrong.

## The same thing in PyTorch

Later chapters use PyTorch. The feed-forward plate corresponds to this call, with a batch of B rows of 512 numbers in and B rows of 10 scores out:

```python
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(512, 256), nn.ReLU(),
    nn.Linear(256, 256), nn.ReLU(),
    nn.Linear(256, 10),
)
```

The softmax is applied to the 10 scores after the last layer. We do not run this here; chapter 4 does.

## What you can now do

- Take any row on either timeline and say whether it added a mechanism or spent one.
- Take any plate and name what it does with fixed weights facing input of unfixed length, and what it charges.
- Say what one encoder block does not supply: order, and anything past the sequence it is handed.

## What is still missing

- Nothing here trains anything. The weighted sum is chapter 1, the update rule chapter 2, and backpropagation chapter 3.
- No run in this chapter compares two architectures. A cost printed as a number is a fact about the arrangement, not a result. Chapter 5 gives the held-out benchmark that makes a comparison fair.
- The plates show shapes, not behaviour on real data. Chapters 7 to 12 do that, one plate at a time.

## Sources

What the figures in this chapter rest on, checked against the publisher. `admin/SOURCES.md` holds the full registry and the identifiers that were rejected.

- McCulloch & Pitts (1943). A logical calculus of the ideas immanent in nervous activity. *Bull. Math. Biophys.* 5, 115-133. doi:10.1007/BF02478259
- Rosenblatt (1958). The perceptron: a probabilistic model for information storage and organization in the brain. *Psychological Review* 65, 386-408. doi:10.1037/h0042519
- Rumelhart, Hinton & Williams (1986). Learning representations by back-propagating errors. *Nature* 323, 533-536. doi:10.1038/323533a0
- Hochreiter & Schmidhuber (1997). Long short-term memory. *Neural Computation* 9(8), 1735-1780. doi:10.1162/neco.1997.9.8.1735
- LeCun, Bottou, Bengio & Haffner (1998). Gradient-based learning applied to document recognition. *Proc. IEEE* 86(11), 2278-2324. doi:10.1109/5.726791
- Krizhevsky, Sutskever & Hinton. ImageNet classification with deep convolutional neural networks. *Comm. ACM* 60(6), 84-90 (2017 reprint of the 2012 paper). doi:10.1145/3065386
- Vaswani et al. (2017). Attention is all you need. arXiv:1706.03762
- Jumper et al. (2021). Highly accurate protein structure prediction with AlphaFold. *Nature* 596, 583-589. doi:10.1038/s41586-021-03819-2

## Questions

1. Which rows of the 1943 to 1997 plate involve a weight that is fitted, and which involve numbers set by hand?
2. What is the difference between an IDEA row and an APPLICATION row? Name the two APPLICATION rows on the 2012 to 2022 plate.
3. The 1969 row is often summarised as "nothing could train a second layer". Why is that too strong? Name two earlier or later credits you would add.
4. For the feed-forward plate, state the input shape, the output shape and the three weight matrix sizes. Which boxes own weights?
5. Name one price the recurrent cell pays and one price attention pays, and say how the second price relates to the first.

Answers are in `code/architectures/answers.md`.
