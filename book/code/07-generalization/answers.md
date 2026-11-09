# Answers: Does the model work on new data?

1. Training loss measures fit to the rows the weights were adjusted on, so it cannot say how the network does on new genes. The held-out (validation) loss answers it: 0.620 at its lowest, rising to 0.872 at epoch 60, while training loss is below 0.001.
2. A gain larger than the spread between seeds licenses saying the difference belongs to the setting and not to the random draw. One seed per setting gives a difference but no spread, so it cannot show how much the result moves by chance.
3. `acc_no_twin` describes a gene the network has not seen. `acc_all` is flattering because it includes genes with an exact training copy, which the network names correctly almost without exception.
4. The test set has become validation data, because a choice was influenced by it. A fresh set that no choice has touched is needed before a test score means anything again.
5. Dropout is noise meant for training only; at scoring time all units should be on, so the output is the same every call. Score the same data twice with the same trained model: the two numbers must match exactly. If they differ, dropout is still on.
