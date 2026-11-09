jobs = [
 ("architectures","⌂","Architectures, and where each one came from","Each era changes either the block or the input; 2017 to 2022 changes both.","(no week: use the plates' <desc> text and the old chapter /home/user/src411/411/chapters/00-architectures.md; quotes for this chapter may come from plate <desc> text)","(this chapter is the timeline: omit [timeline])",
  "This is the spine of the book. One step per plate, in the order the plates are currently placed in chapters/architectures.md. In [frame], use data='one grid, sequence or protein, drawn small enough to check by hand', representation='the block (what the weights are) and the input (what the first layer is handed)', transformation='one architecture per plate', evidence='each plate's shapes agree with its code'. Each step's claim should say what the plate changes (the block or the input). Add one extra field per step, `chapter = \"<stem>\"`, naming the book chapter that builds it (mapping: 1943/1958 -> 01-linear-analysis; update rule -> 02-autodifferentiation; 1986 backprop -> 03-backpropagation; 1969 XOR / feedforward -> 04-neural-networks; quiet years -> 05-evaluation; 2012 -> 07-generalization; recurrent -> 08-fixed-size-inputs; 2013 tokens -> 09-embeddings; convolutional/eq-conv-window -> 10-whole-sequences; attention-worked -> 11-attention; encoder-block -> 12-encoder; autoencoder -> none, omit). No [[code]] and no [[questions]] for this chapter. [next] chapter = 00-objects. Respect /home/user/src411/411/admin/REVIEW.md confirmed corrections."),
 ("00-objects","0","Objects, and the shape of the work","Data, model, evaluate. A rule you cannot write down, and classes as the way to hold it.","week00_oop","(omit [timeline]: chapter 0 is the shape of all the work)",""),
 ("01-linear-analysis","1","Linear analysis","Course orientation, what a model is for, and the split between training and testing.","week01_tensors (also notebook /home/user/intermediate-ml/02_autodiff_lecture.ipynb for the penguin line through two points)","1943 and 1958: a weighted sum of inputs (lineage-a-1943-1997)",""),
 ("03-backpropagation","3","Backpropagation","The chain rule applied where the values were recorded, then the backward pass.","week03_backpropagation (lecture/lab are empty templates: use 'week03 outline.md', instructor/, and /home/user/intermediate-ml/03_backprop_lecture.ipynb)","1986: backpropagation (lineage-a-1943-1997)",""),
 ("04-neural-networks","4","Neural networks","Neurons, width versus depth, one problem in three representations, and the climb to nn.Module.","week04_nn (also /home/user/intermediate-ml/modelinglab.ipynb)","1969: no single cut separates XOR, two do (lineage-a-1943-1997)",""),
 ("05-evaluation","5","Evaluation: how you know a model works","The two jobs of evaluation, the four counts, accuracy that is high and useless, and which error is expensive.","week05_evaluation","the quiet years, when held-out benchmarks judged a model (quiet-years)",""),
 ("06-multiclass","6","Multiclass and softmax","k-mers, logits, softmax and cross-entropy, on genes.","week06_multiclass","the softmax at the end of the feed-forward plate (feedforward)",""),
 ("07-generalization","7","Does the model work on new data?","What each split is for, learning curves, what \"new\" means, dropout and seeds, and a leakage case.","week07_generalization","2012: the same layers on far more data (lineage-b-2012-2022)",""),
 ("08-fixed-size-inputs","8","What a fixed-size input can and cannot learn","Three readers of one string task, padding, and five tests that separate kinds of failure.","week08_sequence_failure (lecture only, no lab; run_log.json)","1997: recurrence and the LSTM (lineage-a-1943-1997)",""),
 ("09-embeddings","9","Giving tokens meaningful numbers","Embeddings: a table and a head, a similarity map, and the catch.","week09_embedding","2013: a token given a vector fitted to its neighbours (lineage-b-2012-2022)",""),
 ("10-whole-sequences","10","Why whole sequences are hard","Three reductions to a fixed width: average, flatten, slide a window.","week10_sequence_limit","one filter reused at every position (convolutional)",""),
 ("11-attention","11","Attention","A weighted average over positions: queries, keys, heads, order, and what attention repairs.","week11_attention","2017: every position compares against every position (lineage-b-2012-2022)",""),
 ("12-encoder","12","The full encoder","What attention cannot do alone, the pre-norm block, shapes, and an ablation.","week12_encoder","2015 shortcut connections and the 2017 transformer (lineage-b-2012-2022)",""),
]
for stem,num,title,gist,week,row,extra in jobs:
    open(f'/tmp/claude-0/forms-jobs/{stem}.txt','w').write(f"""Read /home/user/intermediate-ml/book/FORM.md, then the reference instance /home/user/intermediate-ml/book/forms/02-autodifferentiation.toml. Write ONE file: /home/user/intermediate-ml/book/forms/{stem}.toml. You may also edit files in /home/user/intermediate-ml/book/code/{stem}/ (trim prints, fix answers.md numbering, remove class-time wording). Touch nothing else.

The author found the previous chapters had far too much model-written prose. This is a light mining pass: the form, the plates and the code carry the chapter; prose fields are short and, for quotes, copied from her delivered material. When in doubt, leave a field out.

number = "{num}"
title = "{title}"
gist = "{gist}"
Delivered sources: /home/user/src411/411/weeks/{week.split(' ')[0]}/ (lecture.md, lab.md, instructor/, run_log.json if present). {week}
Course frame register: /home/user/src411/411/curriculum.toml (corrected by /home/user/src411/411/admin/BOOK.md).
Timeline row: {row}
Plates to place: every {{{{figure ...}}}} line currently in /home/user/intermediate-ml/book/chapters/{stem}.md.
Existing verified code: /home/user/intermediate-ml/book/code/{stem}/ (scripts and answers.md). Reuse them; do not invent new numbers.
{extra}

Finish by building as FORM.md says and reply with: rendered word count of prose fields (estimate), the steps' claims, and anything you left out.""")
print("ok")
