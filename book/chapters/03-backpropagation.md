# Backpropagation

Chapter 2 ran a loop: compute the loss, call `.backward()`, step each weight against the gradient it produced. The call was taken on trust. This chapter opens it.

A model is a composition of operations, and a forward pass runs that composition in order on one example. Backpropagation runs the same composition in reverse: each operation supplies its own derivative, taken at the values it was given, and the chain rule multiplies one local derivative per operation into the gradient of the loss with respect to every weight. No derivative of the whole model is written down.

The week's model is small and its batch fixed: two layers, with a computation graph that can be drawn out and read. The three plates each work a model of their own, none larger than two layers. What they share is the object: a graph whose nodes still hold their forward values when the backward walk arrives.

The week sets one investigation: derive a backward pass, then check it, so that local derivatives compose to an observed gradient. Nothing in chapter 2 was wrong; its loop stood on a mechanism it did not state. What comes next is the layer itself — width, depth, activation — where the architecture is the question and here it is held fixed. The week had no lab of its own: its Thursday session went to the Quiz 1 study guide, and the take-home was a rebuild of these steps.


## The chain rule multiplies one local derivative per operation

[The chain rule](#fig-eq-chain-rule) writes the derivative of the loss with respect to a weight as a product of three factors, one per operation in the composition. Each factor is the derivative of exactly one operation, evaluated at the values that operation received. The loss's slope needs only the output and the target. The multiply's slope is the input vector. The middle factor is one because its operation is a pass-through, not because the chain rule drops a term.

{{figure eq-chain-rule}}

A zero in any factor zeroes the product. And no factor refers to any operation but its own, which is what lets the same product be assembled at every node of a much larger graph.

The plate gives no order for applying the rule across many operations, and its model has neither a bias term nor a nonlinearity.

## The graph you build forward is the one you walk back

[The graph you build forward is the one you walk back](#fig-trace-backward-graph) runs one example through five stages twice. The first panel reads left to right and leaves every intermediate on the graph: hidden sums, activations, the output sum, the output, the loss. The second panel walks the same five stages right to left, and at each node prints three things — the gradient that arrived, the node's own local derivative, and their product. That product is what the node hands to the stage before it.

{{figure trace-backward-graph}}

The structure repeats because the rule is local. A logistic multiplies by its own slope in terms of its output. A sum multiplies by whatever sits on the other side of each term, once to fill that term's weight gradient and once to hand a gradient down. Nothing at a node consults the rest of the model.

Two consequences come from the forward panel. Weights receive gradients and inputs do not, because the input is data and nothing about it updates. And the local derivatives are taken at the forward values, so those values must still exist when the walk reaches the node. Every gradient was checked against a central finite difference of the same loss; the check is what makes the reverse walk evidence rather than assertion.

The plate shows one example and no update: the weights are fixed, the gradient is reported, and nothing says whether that direction is worth following.

## Two sums back for every one forward

[Two sums back for every one forward](#fig-budget-backward-cost) counts multiplies. The forward sweep applies every weight once. The backward sweep applies each weight twice, in two weighted sums at each layer: one producing that layer's weight gradients, one producing the gradient handed to the layer before. The ratio it prints is the argument — a step costs a small multiple of a forward pass, not a forward pass per weight. The gradient into the input is never computed: the input is data.

{{figure budget-backward-cost}}

The second panel is about models, not this one. Step cost and backward cost are lines in the first layer's share of the weights, and each stays inside a fixed band for every model. The dots carry one stack out to thirty-two hidden layers and the cost does not climb, because the accounting is per weight rather than per layer: depth adds stages, not price.

What multiplies do not measure: the forward values must be held in memory for the walk, a count is not a time, and none of it says whether a step made the loss smaller, or how far to go.

## What you can now do

- Write a weight's gradient as a product of one local derivative per operation, and say what each factor was evaluated at.
- Read a computation graph forward for values and backward for gradients, naming at each node the arriving gradient and the local derivative.
- Say why every weight receives a gradient and the model's input does not.
- State the cost of one training step in forward passes, and why it does not grow with depth.
- Check a hand-derived gradient against a central finite difference of the same loss.

*Grounded in the lab and the plates only; the week ships no lecture text.*

## Sources

What the figures in this chapter rest on, checked against the publisher. `admin/SOURCES.md` holds the full registry and the identifiers that were rejected.

- Rumelhart, Hinton & Williams (1986). Learning representations by back-propagating errors. *Nature* 323, 533-536. doi:10.1038/323533a0

## Questions

No verified questions for this week: week 3 ships no lab rubric, so none are written here.


---

← [The machine computes the derivative](02-autodifferentiation.md)  ·  [Neural networks and new classes](04-neural-networks.md) →
