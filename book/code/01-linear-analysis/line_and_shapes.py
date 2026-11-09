# A line through two points, then shapes, dot product and matrix multiply.
# Shape inference and the inner-size check follow SmolML's
# smolml/core/ml_array.py (MIT); the line is from our week-2 notebook.

def shape(data):
    """(rows, columns, ...) read off a nested list, as MLArray._infer_shape does."""
    return (len(data),) + shape(data[0]) if isinstance(data, list) else ()

def dot(a, b):
    if shape(a) != shape(b):
        raise ValueError(f"cannot dot shapes {shape(a)} and {shape(b)}")
    return sum(x * y for x, y in zip(a, b))

def matmul(a, b):
    if shape(a)[1] != shape(b)[0]:
        raise ValueError(f"inner sizes differ: {shape(a)} and {shape(b)}")
    return [[dot(row, list(col)) for col in zip(*b)] for row in a]

# The penguin line through Adelie (192 mm, 3.725 kg) and Gentoo (212 mm, 4.725 kg).
(xa, ya), (xb, yb) = (192, 3.725), (212, 4.725)
m = (yb - ya) / (xb - xa)          # rise over run, kg per mm
b = ya - m * xa                    # where the line crosses x = 0
print(f"slope {m:.4f} kg/mm, intercept {b:.3f} kg")
print(f"flipper 200 mm -> {m * 200 + b:.3f} kg")

# The dot-product plate: two vectors of four integers.
print("dot:", dot([2, 1, -3, 4], [3, -2, 1, 1]))

# Row 1 of A against column 2 of B, as in the matrix-multiply plate.
print("C12:", matmul([[2, 1, 3]], [[0, 2], [0, 1], [0, 5]]))

for bad in (lambda: dot([2, 1, -3, 4], [3, -2, 1]),
            lambda: matmul([[1, 2, 3], [4, 5, 6]], [[1, 2, 3], [4, 5, 6]])):
    try:
        bad()
    except ValueError as err:
        print("caught:", err)
