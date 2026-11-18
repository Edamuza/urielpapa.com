---
term: Tokenizer
aka: []
seoTitle: "What Is a Tokenizer? Definition and Example"
description: >-
  A tokenizer splits text into the tokens a language model reads, writes and
  bills by. What it does, the main kinds, and why counts differ between models.
definition: >-
  A tokenizer is the part of a language model's pipeline that splits text into
  tokens, small pieces such as words, parts of words or punctuation, and turns
  each one into a number the model can process.
hub: ai
stack:
  - claude
  - gpt
related: []
deeper:
  - what-is-tokenization
sources:
  - title: Tokenization algorithms (Hugging Face Transformers docs)
    url: https://huggingface.co/docs/transformers/tokenizer_summary
  - title: tiktoken on GitHub
    url: https://github.com/openai/tiktoken
published: 2026-11-18
lastChecked: 2026-11-18
draft: false
---

## What does a tokenizer do?

A model never sees your words directly. The tokenizer runs first: it cuts the text into tokens from a fixed vocabulary and maps each token to an id. The model reads those ids, predicts new ones, and the tokenizer turns the answer back into text.

Most modern tokenizers work on subwords, a middle ground between whole words and single characters. Hugging Face's guide to [tokenization algorithms](https://huggingface.co/docs/transformers/tokenizer_summary "Hugging Face's guide to tokenization algorithms") explains why: a vocabulary of whole words grows huge and still misses new words, while single characters make every text very long. With subwords, "common words stay intact as single tokens, and rare or unknown words decompose into subwords."

## What kinds of tokenizers are there?

The same guide names three main subword algorithms:

| Algorithm                  | Used by (per Hugging Face)    |
| -------------------------- | ----------------------------- |
| Byte pair encoding (BPE)   | Llama, Gemma, Qwen2, GPT      |
| Unigram                    | T5, BigBird, Pegasus          |
| WordPiece                  | BERT, DistilBERT, Electra     |

OpenAI publishes its tokenizer as [tiktoken](https://github.com/openai/tiktoken "OpenAI's tiktoken tokenizer on GitHub"), "a fast BPE tokeniser for use with OpenAI's models." You can count tokens with it in a few lines:

```python
import tiktoken

enc = tiktoken.get_encoding("o200k_base")
print(len(enc.encode("How many tokens is this sentence?")))
```

## Why does the tokenizer matter for cost?

Every model has its own tokenizer, so the same text can be a different number of tokens in Claude, GPT or Gemini. Providers charge per token, which makes the tokenizer part of the price. When Anthropic released Claude Haiku 5.5, a footnote said its new tokenizer uses slightly more tokens per task, as I covered in my [Claude Haiku 5.5 take](/news/claude-haiku-5-5 "Claude Haiku 5.5: Anthropic's small model gets much cheaper").

For a full walk through tokens, context windows and how to estimate an AI bill, read [what tokenization is and why it decides what AI costs](/blog/what-is-tokenization "What is tokenization, and why does it decide what AI costs?").
