#!/bin/bash
sed -i 's/title: `O que há de novo? - Versão 2.2.2 ✨🚀`/title: `O que há de novo? - Versão 2.3.0 ✨🚀`/g' src/components/StartScreen.tsx

# Also, there's a big block of text in the content: `Olá, artista!...`.
# Let's replace the whole onClick payload to use the `changelog` object we already have!
