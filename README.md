# API de Gerenciamento de Pedidos

API REST para gerenciar pedidos de uma pequena loja, construída com **Node.js + Express** em **arquitetura em camadas**, com validação de dados, tratamento centralizado de erros e testes automatizados com **Jest**.

> Projeto prático avaliativo — Tópicos Avançados em Sistemas de Informação II.
> Aluno: _SEU NOME_ — RA: _SEU RA_

---

## 1. Instalação e execução

Pré-requisito: Node.js 18 ou superior.

```bash
git clone <URL-DO-REPOSITORIO>
cd api-gerenciamento-pedidos
npm install
npm start
```

A API sobe em `http://localhost:3000`. Para usar outra porta: `PORT=4000 npm start`.

Rodar os testes automatizados:

```bash
npm test
```

> Os dados ficam **em memória**: ao reiniciar o servidor, todos os pedidos são apagados e os IDs voltam a começar em 1.

---

## 2. Rotas

| Método | Rota                  | Descrição                    | Sucesso | Erros possíveis |
|--------|-----------------------|------------------------------|---------|-----------------|
| POST   | `/pedidos`            | Cadastra um pedido (RF01)    | 201     | 400             |
| GET    | `/pedidos`            | Lista todos os pedidos (RF02)| 200     | —               |
| GET    | `/pedidos/:id`        | Consulta um pedido (RF03)    | 200     | 404             |
| PATCH  | `/pedidos/:id/status` | Atualiza o status (RF04)     | 200     | 400, 404        |

Qualquer rota não listada responde **404** em JSON. Erros inesperados respondem **500** com `{"erro": "Erro interno do servidor."}`, sem expor detalhes internos.

---

## 3. Valores reconhecidos e regras de validação

Definidos em um único lugar: `src/constants/pedido.js`.

| Campo        | Regra |
|--------------|-------|
| `cliente`    | Obrigatório. Texto não vazio **após remover espaços das extremidades**. É salvo já sem esses espaços. |
| `valor`      | Obrigatório. Deve ser do tipo **número** (JSON) e maior que zero. A string `"350"` é rejeitada. |
| `tipo`       | `entrega` ou `retirada` (minúsculas, exatamente assim). |
| `prioridade` | `baixa`, `normal` ou `alta` (minúsculas, exatamente assim). |
| `id`, `status` | **Não** são aceitos na criação: se enviados, são ignorados. O `id` é sequencial e o status inicial é sempre `recebido`. |

Outras regras:

- **Identificador**: só IDs formados apenas por dígitos podem existir. `GET /pedidos/abc` e `GET /pedidos/999` (inexistente) respondem **404**.
- **Corpo inválido**: JSON malformado ou corpo que não seja objeto (ex.: um array) responde **400**.
- Na criação, todos os erros de validação são devolvidos **de uma vez**, em `detalhes`.

---

## 4. Status e transições permitidas

```
recebido ──► em_preparacao ──► enviado ──► entregue
   │               │
   └──► cancelado ◄┘
```

| Status atual    | Pode ir para                  |
|-----------------|-------------------------------|
| `recebido`      | `em_preparacao`, `cancelado`  |
| `em_preparacao` | `enviado`, `cancelado`        |
| `enviado`       | `entregue`                    |
| `entregue`      | — (estado final)              |
| `cancelado`     | — (estado final)              |

Justificativas:

- **Não é possível pular etapas** (ex.: `recebido` → `entregue`), para que o histórico do pedido seja coerente.
- **Pedido enviado não pode ser cancelado**: a mercadoria já saiu da loja; o caminho correto seria um fluxo de devolução, fora do escopo.
- **Estados finais** (`entregue`, `cancelado`) não aceitam mudanças.
- "Mudar" para o status atual também é rejeitado, pois não é uma transição.

Ordem das verificações no `PATCH`: (1) o pedido existe? senão **404**; (2) o corpo tem um `status` reconhecido? senão **400**; (3) a transição é permitida? senão **400**, informando as transições permitidas.

> Decisão: transição inválida usa **400**, como pede o enunciado ("dados inválidos: 400"). Uma alternativa defensável seria **409 Conflict**, pois o dado é válido mas conflita com o estado atual do recurso.

---

## 5. Exemplos

### Criar pedido — 201
```http
POST /pedidos
Content-Type: application/json

{ "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal" }
```
```json
{ "id": 1, "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal", "status": "recebido" }
```

### Criar pedido inválido — 400
```http
POST /pedidos
Content-Type: application/json

{ "cliente": "   ", "tipo": "aviao", "valor": 0, "prioridade": "normal" }
```
```json
{
  "erro": "Dados do pedido inválidos.",
  "detalhes": [
    { "campo": "cliente", "mensagem": "Cliente é obrigatório e deve ser um texto não vazio." },
    { "campo": "valor", "mensagem": "Valor deve ser numérico e maior que zero." },
    { "campo": "tipo", "mensagem": "Tipo inválido. Valores aceitos: entrega, retirada." }
  ]
}
```

### Consultar pedido inexistente — 404
```http
GET /pedidos/999
```
```json
{ "erro": "Pedido com id 999 não encontrado." }
```

### Atualizar status — 200
```http
PATCH /pedidos/1/status
Content-Type: application/json

{ "status": "em_preparacao" }
```
```json
{ "id": 1, "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal", "status": "em_preparacao" }
```

### Transição não permitida — 400
```http
PATCH /pedidos/1/status
Content-Type: application/json

{ "status": "recebido" }
```
```json
{
  "erro": "Transição de \"em_preparacao\" para \"recebido\" não é permitida.",
  "detalhes": { "statusAtual": "em_preparacao", "transicoesPermitidas": ["enviado", "cancelado"] }
}
```

---

## 6. Arquitetura

```
src/
├── server.js                      # Sobe o servidor (app.listen)
├── app.js                         # Monta o Express: JSON, rotas, middlewares
├── routes/pedidoRoutes.js         # Método + caminho -> controller
├── controllers/pedidoController.js# Lê req, chama service, define status HTTP de sucesso
├── services/pedidoService.js      # Regras de negócio: validação e transições
├── repositories/pedidoRepository.js # Armazenamento em memória
├── errors/AppError.js             # Erros de domínio (400 / 404)
├── middlewares/errorHandler.js    # Converte erros em respostas HTTP
├── middlewares/notFound.js        # 404 para rotas inexistentes
└── constants/pedido.js            # Tipos, prioridades, status e transições
tests/
├── pedidoService.test.js          # Testes unitários das regras de negócio
└── pedidos.api.test.js            # Testes de integração via HTTP (supertest)
postman/
└── pedidos.postman_collection.json
evidencias/                        # Prints do Postman
```

Fluxo de uma requisição:

```
Requisição → routes → controller → service → repository
                          │            │
                          │       lança ValidationError / NotFoundError
                          ▼            ▼
                     next(erro) → errorHandler → resposta JSON (400 / 404 / 500)
```

### Responsabilidade de cada camada

- **Routes**: só associam método e caminho a uma função do controller. Nenhuma lógica.
- **Controller**: traduz HTTP ↔ aplicação. Pega `req.params`/`req.body`, chama o service e responde com 200/201. Não valida regra de negócio.
- **Service**: concentra as regras (campos obrigatórios, valores aceitos, status inicial, transições). Não conhece `req`/`res`; sinaliza problemas lançando erros de domínio.
- **Repository** (pasta adicional): isola o armazenamento. Justificativa: se a loja passar a usar banco de dados, só este arquivo muda. Ele devolve **cópias** dos objetos, para que nenhuma camada altere os dados sem passar por ele.
- **Errors + errorHandler** (pastas adicionais): centralizam a decisão "qual código HTTP para qual erro". Erros de domínio (`AppError`) viram 400/404; JSON malformado vira 400; **qualquer outro erro é tratado como inesperado e vira 500**, nunca como erro de validação do usuário.
- **Constants** (pasta adicional): fonte única dos valores aceitos, usada tanto pela validação quanto pelas mensagens de erro, evitando divergência entre código e documentação.

### Padrão implementado

Arquitetura em camadas no estilo **Routes → Controller → Service → Repository**, com **middleware centralizado de tratamento de erros** e **erros de domínio tipados** (`ValidationError`, `NotFoundError`). As transições de status seguem uma **máquina de estados** simples, representada como um mapa `status atual → status permitidos`.

`app.js` e `server.js` são separados para que os testes usem a aplicação sem abrir uma porta de rede.

---

## 7. Testes

### Automatizados (Jest + supertest)

```bash
npm test
```

- `tests/pedidoService.test.js` — unitários do service: criação, `trim` do cliente, cada regra de validação, IDs inválidos, todas as transições permitidas e proibidas.
- `tests/pedidos.api.test.js` — integração HTTP: códigos 201/200/400/404/500 de cada rota, JSON malformado, rota inexistente e erro inesperado (simulado com `jest.spyOn`) resultando em 500.

### Manuais (Postman)

Importe `postman/pedidos.postman_collection.json` no Postman. A variável `baseUrl` aponta para `http://localhost:3000`. Execute as requisições na ordem numerada, com o servidor recém-iniciado.

As capturas estão em `evidencias/`:

| Arquivo | Cenário |
|---------|---------|
| `01-criacao.png` | POST válido → 201 |
| `02-validacao.png` | POST inválido → 400 |
| `03-listagem.png` | GET /pedidos → 200 |
| `04-consulta-inexistente.png` | GET /pedidos/999 → 404 |
| `05-atualizacao.png` | PATCH de status válido → 200 |

---

## 8. Uso de IA

> ⚠️ **Preencha esta seção com a sua experiência real.** O texto abaixo é um ponto de partida; o professor pode comparar o que está aqui com o seu domínio do código na atividade individual.

**Utilizei IA?** Sim — _(ferramenta: Claude, da Anthropic)_.

**Para quais tarefas:** _(ex.: gerar a estrutura inicial em camadas, sugerir casos de teste, revisar o README. Descreva o que você realmente pediu.)_

**Sugestão aceita:** _(ex.: separar `app.js` de `server.js` — aceitei porque permite testar com supertest sem abrir porta.)_

**Sugestão modificada ou rejeitada (com justificativa):** _(descreva algo que você de fato alterou, ex.: mudar o código de transição inválida de 400 para 409, ou aceitar `valor` como string numérica, e por quê.)_

**Como validei o código:** _(ex.: rodei `npm test`, testei cada rota no Postman, tentei entradas diferentes das dos exemplos.)_
