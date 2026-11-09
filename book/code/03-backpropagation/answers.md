# Chapter 3 answers

1. At w = 1: the forward record is 2, 3, 9. The local slopes are 2 (multiply), 1 (add) and 2 x 3 = 6 (square). Their product is 2 x 1 x 6 = 12. The hand derivative 8w + 4 is 12 at w = 1.
2. The square's slope is twice the value it received, and that value (7 at w = 3) only exists during the forward pass. If the graph discarded it, the backward pass could not evaluate the slope. At w = 3 the square's slope is 14; it would be a different number for a different input.
3. The multiply's factor is the input, and here it is 0, so the product 3 x 1 x 0 is 0. The weight has no effect on the output for this example, because it is multiplied by 0. For a different example with a non-zero input it would receive a gradient, so it can still matter.
4. Forward: 10 + 10 = 20 multiplies. Backward: 10 (second-layer weights) + 10 (gradient handed down) + 10 (first-layer weights) = 30. Step cost: 50 multiplies, which is 2.5 forward passes. This agrees with the line 3 - s at s = 0.5.
5. The output logistic's slope is yhat(1 - yhat) = 0.6340 x 0.3660 = 0.2320. The gradient it passes on is 0.5340 x 0.2320 = 0.1239. The gradient for the first output weight is 0.1239 x 0.6225, about 0.0771.
