# Answers: Objects, and the shape of the work

1. Yes. After a restart and a run-all, the cells run in order, so the cell that defines `square` has run before the cell that calls it. A `NameError` appears if you run the calling cell first, or skip the defining cell, because the name does not exist yet in the notebook's shared state.
2. Run it and read the printed table: `diamonds.groupby('cut')['price'].mean()`. We did not run this here (no seaborn in the sandbox), so no values are given; compare your table's largest and smallest entries.
3. `(5, 1)`. The inner sizes, 3 and 3, match and disappear. The outer sizes, 5 and 1, remain. Each of the 5 output cells is the dot product of one row of the first matrix with the single column of the second.
4. A correct class keeps `self.balance = 0`, adds in `deposit`, and in `withdraw` raises `ValueError` before subtracting when `amount > self.balance`. The first test cell (deposit 50, withdraw 20) leaves `w.balance` at 30. The second (withdraw 100 from 30) raises `ValueError`.
5. `a` holds `[1, 2, 3, 4]`. The line `b = a` gives one list a second name, so `append` through `b` changes the list `a` names. Writing `b = a.copy()` makes an independent list.
