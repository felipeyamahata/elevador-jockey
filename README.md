# O Subsolo — Experiência Jockey

Simulação interativa de uma instalação cenográfica para um evento no Jockey Club do Rio de Janeiro. A cabine permanece no mesmo lugar: o painel e o áudio criam a ilusão de uma descida do térreo ao -7.

## Executar

Abra `index.html` em um navegador moderno. Não há dependências externas nem necessidade de internet.

Para servir localmente:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Acesse `http://127.0.0.1:8080`.

## Fluxo

1. **Entrada:** feche a porta de entrada para simular o acionamento do sensor magnético.
2. **Cabine:** pressione **-7** para iniciar a descida visual e sonora.
3. **Operação:** na chegada, abra a porta de saída, feche após o desembarque e prepare a próxima visita.

Desktop exibe os três ambientes lado a lado, com destaque para o painel central. Em telas de até 860 px, a navegação fixa inferior alterna entre Entrada, Cabine e Operação. A planta permanece sempre visível. No mobile, o layout se adapta à altura disponível para mostrar planta, ambiente e ação principal junto da navegação inferior, sem rolagem nas dimensões usuais de celular.

“Apresentar experiência” executa um ciclo automático de aproximadamente 18 segundos, acompanhando o ambiente de cada etapa. Navegar manualmente durante a apresentação mantém o ciclo e entrega ao usuário a escolha do ambiente. Parar durante a descida interrompe o contador e retorna ao térreo. Reiniciar cancela a apresentação e o movimento em qualquer etapa.

O botão de som permite silenciar os efeitos sintetizados com Web Audio API. Textos técnicos e histórico ficam no botão “Sobre” do cabeçalho. Portas na planta também podem ser acionadas quando o estado permite.

## Escopo

Sensores, portas e comunicação entre dispositivos são simulados na mesma página. Não há integração com hardware, servidor ou smartphones reais.

## Arquivos

- `index.html`: ambientes, planta, navegação e informações da instalação.
- `style.css`: identidade visual, layout responsivo e estados.
- `app.js`: máquina de estados, apresentação automática e áudio.
- `PRODUCT.md` e `DESIGN.md`: contexto do produto e direção visual aprovada.
