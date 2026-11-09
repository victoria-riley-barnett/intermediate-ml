# Squared error is minimised at the mean, absolute error at the median.
readings = [4.0, 4.2, 4.1, 4.3, 12.0]
grid = [i / 100 for i in range(0, 1501)]
best_sq = min(grid, key=lambda c: sum((r - c) ** 2 for r in readings))
best_ab = min(grid, key=lambda c: sum(abs(r - c) for r in readings))
print(f"squared error is smallest at {best_sq:.2f}   (mean {sum(readings)/len(readings):.2f})")
print(f"absolute error is smallest at {best_ab:.2f}   (median {sorted(readings)[2]:.2f})")
