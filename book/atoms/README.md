# Atoms

The book is built from atoms. An atom is **one statement with one check**. A chapter
is a form that lists atoms in order, names the plates and code beside them, and
leaves glue slots for the author. A model may fill an atom; only the author writes glue.

## The test for an atom

- It says one thing. If the sentence needs "and" to join two claims, it is two atoms.
- It has exactly one primary verifier. If it would need two checks, split it.
- It can be linked from more than one place: it stands without the sentence before it.

## Kinds

| kind | what it holds |
|---|---|
| `term` | a definition: `term = "learning rate"`, `text` = the definition |
| `claim` | a general statement about how something behaves |
| `example` | a worked case small enough to recompute |
| `code` | a line a script prints |
| `figure-fact` | a number read off a plate |
| `question` | a question, with its `answer` |

## The verifiers (`[atom.verify]`, `method = ...`)

| method | passes when | fields |
|---|---|---|
| `run` | the script in `book/code/` prints every expected line | `script`, `expect` (string or list) |
| `plate` | every number in `text` appears in the plate's `<desc>` | `plate` |
| `computed` | the expression is true, or equals `number` (which must appear in `text`) at that precision | `expr`, `number`? |
| `hand` | the author has signed it | `signed = "YYYY-MM-DD"` |

A `hand` atom is shown as **unsigned** until it is signed. It is never hidden and never
counted as checked.

## Provenance (`[atom.source]`)

`file`, `heading` and `sha1` name the section of the delivered course the atom was
written from. Provenance is not evidence. If that section changes after the atom was
written, the atom shows **drift** until someone rereads the source and restamps it
(`python3 book/verify.py --stamp` fills empty `sha1` values).

## States

`pass` · `unsigned` · `drift` · `fail`. The build stops on `fail` or `drift`, never on
`unsigned`. The full list is on the book's Ledger page.

## Worked example

```toml
[[atom]]
id = "ch2.one-step-check"
kind = "example"
text = "2.6 − 0.01 × (−31.284) = 2.91284."
uses = ["ch2.one-step"]
[atom.verify]
method = "computed"
expr = "2.6 - 0.01 * -31.284"
number = "2.91284"
```

`verify.py` evaluates the expression, rounds it to the five decimals of `2.91284`, finds
that number in the sentence, and records **pass**. The atom's page shows the expression,
links to `ch2.one-step` (which it uses), and lists every atom that uses it in turn.

## A chapter form

```toml
[[section]]
title = "One step, and then many"         # the delivered lab's heading
atoms = ["ch2.update-rule", "ch2.one-step", "ch2.one-step-check"]
figures = ["gradient-descent"]

[[glue]]
name = "direction-to-step"
after = "ch2.slope-check"
text = ""                                  # the author's; shown dashed while empty
```
