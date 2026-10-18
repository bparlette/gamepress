#!/usr/bin/env python3
"""Bridge: run kokoro-onnx from Node (gamepress voice).

Reads text from --text-file (avoids argv limits), chunks long text on
sentence boundaries, synthesizes each chunk, concatenates, writes WAV,
and prints a JSON result to stdout.

Usage:
  python3 tts_bridge.py --model M.onnx --voices V.bin --voice af_sarah \\
      --speed 1.0 --text-file in.txt --out out.wav
"""
import argparse
import json
import re
import sys


def chunk_text(text, max_len=800):
    """Split text into chunks <= max_len chars, on sentence boundaries."""
    text = text.strip()
    if not text:
        return []
    # Split on sentence-ending punctuation followed by whitespace.
    sentences = re.split(r'(?<=[.!?…])\s+', text)
    chunks, cur = [], ''
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if len(cur) + len(s) + 1 <= max_len:
            cur = (cur + ' ' + s).strip()
        else:
            if cur:
                chunks.append(cur)
            # A single over-long sentence: hard-split it.
            while len(s) > max_len:
                chunks.append(s[:max_len])
                s = s[max_len:]
            cur = s
    if cur:
        chunks.append(cur)
    return chunks


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--model', required=True)
    p.add_argument('--voices', required=True)
    p.add_argument('--voice', default='af_sarah')
    p.add_argument('--speed', type=float, default=1.0)
    p.add_argument('--text-file', required=True)
    p.add_argument('--out', required=True)
    args = p.parse_args()

    try:
        from kokoro_onnx import Kokoro
    except ImportError:
        print(json.dumps({'ok': False, 'error': 'kokoro_onnx not installed (pip install kokoro-onnx)'}))
        return 1
    try:
        import soundfile as sf
    except ImportError:
        print(json.dumps({'ok': False, 'error': 'soundfile not installed (pip install soundfile)'}))
        return 1
    import numpy as np

    try:
        with open(args.text_file, encoding='utf-8') as f:
            text = f.read()
    except OSError as e:
        print(json.dumps({'ok': False, 'error': f'cannot read text file: {e}'}))
        return 1

    chunks = chunk_text(text)
    if not chunks:
        print(json.dumps({'ok': False, 'error': 'empty text'}))
        return 1

    try:
        kokoro = Kokoro(args.model, args.voices)
    except Exception as e:
        print(json.dumps({'ok': False, 'error': f'model load failed: {e}'}))
        return 1

    parts, sr = [], None
    for c in chunks:
        try:
            samples, s = kokoro.create(c, voice=args.voice, speed=args.speed)
        except Exception as e:
            print(json.dumps({'ok': False, 'error': f'synthesis failed: {e}'}))
            return 1
        sr = s
        parts.append(np.asarray(samples, dtype=np.float32))

    audio = np.concatenate(parts) if len(parts) > 1 else parts[0]
    # Guard against clipping when chunks join.
    peak = np.max(np.abs(audio))
    if peak > 1.0:
        audio = audio / peak
    try:
        sf.write(args.out, audio, sr)
    except Exception as e:
        print(json.dumps({'ok': False, 'error': f'wav write failed: {e}'}))
        return 1

    print(json.dumps({
        'ok': True,
        'file': args.out,
        'seconds': round(float(len(audio)) / sr, 2),
        'sample_rate': sr,
        'chunks': len(chunks),
        'chars': len(text),
    }))
    return 0


if __name__ == '__main__':
    sys.exit(main())
