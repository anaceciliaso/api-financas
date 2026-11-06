# API de Controle Financeiro

## Integrante:
 Ana Cecília Santana de Oliveira  |  RA: 2565773

---


API REST de finanças pessoais feita com **Node.js, Express, MySQL (mysql2), JWT e bcrypt** — projeto final da disciplina de Programação Web Back-end.

Um usuário se cadastra, faz login e registra **lançamentos** (entradas e saídas), cada um com **categoria** e **fonte/destino**. A API gera relatórios por categoria, por fonte/destino, a **previsão das faturas** dos cartões e, como desafio, uma análise de **saúde financeira**.

---

## 1. Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| [Node.js](https://nodejs.org) | 18 ou superior (LTS) | já traz o NPM |
| [MySQL Server](https://dev.mysql.com/downloads/mysql/) | **8.0.16 ou superior** | necessário para as restrições `CHECK` |
| [VS Code](https://code.visualstudio.com) | — | sugestão: extensões *Postman* e um cliente MySQL |
| [Postman](https://www.postman.com/downloads/) | — | ou a extensão do Postman no VS Code |

## 2. Como rodar (passo a passo)

Abra a pasta do projeto no VS Code e use o terminal integrado (`Ctrl + '`).

```bash
# 1) Instalar as dependências
npm install

# 2) Criar o arquivo de configuração e preencher a senha do MySQL e a JWT_SECRET
cp .env.example .env          # no PowerShell: copy .env.example .env

# 3) Criar o banco, as tabelas e os dados de demonstração
npm run db:reset

# 4) Subir a API em modo desenvolvimento (reinicia sozinha ao salvar)
npm run dev
```

A API sobe em `http://localhost:3000`.

> **Alternativa ao passo 3** (pelo cliente do MySQL, como no livro):
> `mysql -u root -p < database/schema.sql` e depois `mysql -u root -p < database/seed.sql`.
> No PowerShell o `<` não funciona; use `mysql -u root -p -e "source database/schema.sql"`.

### Scripts do `package.json`

| Comando | O que faz |
|---|---|
| `npm start` | sobe a API com `node` |
| `npm run dev` | sobe a API com `nodemon` |
| `npm run db:reset` | **apaga e recria** o banco executando `schema.sql` + `seed.sql` |
| `npm run db:schema` | recria o banco vazio (só `schema.sql`) |
| `npm test` | testes das funções puras (CPF, parcelas, faturas, datas) — não precisa de banco |

## 3. Testando com o Postman

1. No Postman: **Import** → selecione `testes/api-financas.postman_collection.json`.
2. Rode `npm run db:reset` (para os ids da coleção baterem com o banco).
3. Execute as pastas **em ordem** (ou clique em **Run collection**). O login da Ana guarda o token na variável `{{token}}` e o do Bruno em `{{tokenBruno}}` — as demais requisições já usam esses tokens.
4. Cada requisição tem testes automáticos (aba *Test Results*) conferindo o código de status esperado.

Os mesmos testes em `curl` estão em [`testes/requisicoes.md`](testes/requisicoes.md).

### Usuários do seed

| Usuário | E-mail | Senha | CPF | Lançamentos |
|---|---|---|---|---|
| Ana Souza | `ana@email.com` | `Senha123` | 529.982.247-25 | ids 1 a 55 |
| Bruno Lima | `bruno@email.com` | `Senha123` | 987.654.321-00 | ids 56 a 74 |

A Ana tem lançamentos de agosto a novembro de 2026, dois cartões (**Nubank**: fecha dia 3, vence dia 10; **Visa**: fecha dia 25, vence dia 5), um **notebook em 10×**, um **fone em 3×** (R$ 100,00 → 33,34 + 33,33 + 33,33), uma compra **no dia do fechamento** (03/11) e uma **poupança marcada como reserva**.

## 4. Estrutura

```
api-financas/
├── database/
│   ├── connection.js     → pool do mysql2 (lê o .env; dateStrings: true)
│   ├── schema.sql        → criação do banco e das tabelas
│   ├── seed.sql          → dados de demonstração
│   └── setup.js          → executa schema + seed (npm run db:reset)
├── middleware/auth.js    → protegerRota (express-jwt)
├── models/               → classes com TODO o SQL
│   ├── Usuario.js  Categoria.js  FonteDestino.js  Lancamento.js  Relatorio.js
├── routes/               → um express.Router() por recurso
│   ├── auth.js  categorias.js  fontesDestinos.js  lancamentos.js  relatorios.js  saudeFinanceira.js
├── utils/                → funções puras (sem banco, testáveis)
│   ├── cpf.js  parcelas.js  faturas.js  datas.js  dinheiro.js  validacao.js  erros.js  saudeFinanceira.js
├── testes/
│   ├── requisicoes.md                       → curl de todas as rotas
│   ├── api-financas.postman_collection.json → coleção do Postman
│   └── utils.test.js                        → npm test
├── .env.example   .gitignore   package.json   server.js
```

**Divisão de responsabilidades:** a rota valida os dados e monta a resposta; o *model* executa o SQL; o que é cálculo (faturas, parcelas, saúde financeira) fica em `utils/` como função pura.

## 5. Rotas

Todas exigem `Authorization: Bearer <token>`, **exceto** cadastro e login.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/cadastro` | cadastra usuário (+ categorias padrão e "Conta corrente", na mesma transação) |
| POST | `/auth/login` | devolve o token JWT (expira em 1h) |
| GET | `/auth/me` | dados do dono do token |
| GET | `/categorias?tipo=saida` | lista categorias |
| GET | `/categorias/:id` | detalha |
| POST / PUT / DELETE | `/categorias` · `/categorias/:id` | cria (201) · atualiza (200) · exclui (204) |
| GET | `/fontes-destinos?tipo=cartao_credito` | lista fontes/destinos |
| GET | `/fontes-destinos/:id` | detalha |
| POST / PUT / DELETE | `/fontes-destinos` · `/fontes-destinos/:id` | cria · atualiza · exclui |
| GET | `/lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=` | lista com filtros, resumo e paginação (20 por página) |
| GET | `/lancamentos/:id` | detalha |
| POST | `/lancamentos` | cria (com `parcelas` de 1 a 48, só para saída em cartão) |
| PUT | `/lancamentos/:id` | atualiza um lançamento (uma parcela) |
| DELETE | `/lancamentos/:id?todasParcelas=true` | exclui a parcela ou a compra inteira |
| GET | `/relatorios/categorias?inicio=&fim=` | saídas e entradas por categoria + comparação com o período anterior |
| GET | `/relatorios/fontes-destinos?inicio=&fim=` | entradas por fonte, saídas por destino e saldo das contas |
| GET | `/relatorios/faturas?meses=3` | previsão das faturas de cada cartão e limite |
| GET | `/saude-financeira` | **desafio**: indicadores, projeção e dicas |

### Corpos das requisições

```jsonc
// POST /auth/cadastro
{ "nome": "Carla Mendes", "email": "carla@email.com", "cpf": "111.444.777-35", "senha": "Segura2026" }

// POST /categorias   (classe é opcional e só vale para saídas: "necessidade" ou "desejo")
{ "nome": "Assinaturas", "tipo": "saida", "classe": "desejo" }

// POST /fontes-destinos   (diaFechamento, diaVencimento e limite são obrigatórios só para cartão)
{ "nome": "Cartão C6", "tipo": "cartao_credito", "diaFechamento": 31, "diaVencimento": 8, "limite": 2000 }
{ "nome": "Poupança", "tipo": "conta", "reserva": true }

// POST /lancamentos   (parcelas é opcional)
{ "tipo": "saida", "descricao": "Notebook", "valor": 3000, "data": "2026-10-28",
  "categoriaId": 8, "fonteDestinoId": 3, "parcelas": 10 }
```

### Padrão de erro

Todas as respostas de erro têm o formato:

```json
{ "erro": "Dados inválidos.", "campos": { "valor": "O valor deve ser um número maior que zero, com até 2 casas decimais." } }
```

| Código | Quando |
|---|---|
| 200 | consultas, atualizações e login |
| 201 | criação de usuário, categoria, fonte/destino e lançamento |
| 204 | exclusão (sem corpo) |
| 400 | campos ausentes/inválidos, regras de negócio violadas, JSON mal formado |
| 401 | token ausente, inválido ou expirado; login com credenciais erradas |
| 404 | registro inexistente **ou de outro usuário**; rota inexistente |
| 409 | e-mail/CPF já cadastrado; nome repetido; exclusão de registro com lançamentos |
| 500 | erro inesperado (o detalhe vai só para o terminal) |

## 6. Decisões de implementação

**Segurança e unicidade**
- E-mail e CPF únicos são garantidos pelas restrições `UNIQUE` do banco (`uq_usuarios_email`, `uq_usuarios_cpf`). Não há `SELECT` prévio: o erro `ER_DUP_ENTRY` é capturado e o nome da restrição na `sqlMessage` indica qual campo está duplicado.
- Antes de gravar, o e-mail vira `trim().toLowerCase()` e o CPF fica só com dígitos.
- A senha é gravada com `bcrypt` (custo 10). O login busca só pelo e-mail e compara com `bcrypt.compare`. Quando o e-mail não existe, a comparação é feita mesmo assim contra um hash fictício, para que o tempo de resposta não revele quais e-mails estão cadastrados.
- O id do usuário vem **sempre** de `req.auth.id`; toda consulta filtra por `usuario_id`. Pedir um registro de outra pessoa devolve 404.

**Banco**
- Restrições no banco: FKs, `UNIQUE`, `CHECK` para valor positivo, parcelas (1 a 48), dias (1 a 31), campos obrigatórios de cartão e limite positivo. Dinheiro é `DECIMAL(12,2)`.
- Acréscimos ao modelo mínimo: `categorias.classe` (necessidade/desejo, para a regra 50/30/20) e `fontes_destinos.reserva` (reserva de emergência).
- Uso de **pool** com `mysql2/promise` e `async/await`. As transações (cadastro e parcelamento) usam uma conexão obtida com `pool.getConnection()`.
- `dateStrings: true` para receber datas como `'AAAA-MM-DD'`. Valores `DECIMAL` e `SUM` (que o mysql2 devolve como texto) são convertidos com `Number()`; somas no JavaScript são feitas em centavos.
- Usamos **Express 5**, que encaminha automaticamente para o middleware de erros as exceções lançadas em rotas `async`. Por isso as rotas fazem `throw new ErroApi(status, mensagem, campos)` e o `server.js` monta a resposta padrão.

**Regras de negócio**
- **Categorias/fontes:** não é possível excluir se houver lançamentos (409), nem trocar o `tipo` se já houver lançamentos (409), pois isso quebraria lançamentos existentes.
- **Parcelamento:** só para saídas em cartão de crédito. Gera uma linha por parcela, todas com a data da compra e o mesmo `grupo_parcelamento` (`crypto.randomUUID()`), dentro de uma transação. O `PUT` altera uma parcela por vez e não muda o número de parcelas.
- **Listagem:** sem `inicio`/`fim`, usa o mês corrente. O resumo (entradas, saídas, saldo) considera todos os filtros.
- **Relatório por categoria:** o período anterior tem o mesmo tamanho. Se o período for de meses inteiros (ex.: 01/10 a 31/10), compara com os meses inteiros anteriores (01/09 a 30/09); senão, com a mesma quantidade de dias. `variacao` é `null` quando não há valor no período anterior.
- **Faturas:** `meses` é a quantidade de faturas a partir da **atual** (a que receberia uma compra feita hoje). Se houver uma fatura que já **fechou mas ainda não venceu**, ela aparece antes, com `status: "fechada"`. O limite utilizado soma todas as parcelas de faturas que ainda não venceram (inclusive além do horizonte pedido).
- **Modelagem de entradas:** a fonte de uma entrada pode ser uma `renda` (ex.: "Salário ACME") ou uma `conta` (ex.: rendimento da poupança). Transferências entre contas não são modeladas; por isso o saldo de uma conta no relatório considera apenas os lançamentos ligados a ela.

## 7. Desafio — Saúde financeira

`GET /saude-financeira` analisa os **3 últimos meses completos** e o mês atual.

Para não distorcer a análise com compras grandes parceladas, usamos **competência ajustada**: lançamentos à vista contam no mês da data; cada parcela de uma compra parcelada conta no mês de vencimento da fatura em que cai (o notebook de R$ 3.000 em 10× pesa R$ 300 por mês, e não R$ 3.000 em outubro).

| Indicador | Cálculo | Dica gerada quando… |
|---|---|---|
| Taxa de poupança | (entradas − saídas) ÷ entradas do último mês completo (e média dos 3) | ficar abaixo de **10%** (ou negativa) |
| Comprometimento com cartões | faturas que vencem nos próximos 3 meses ÷ (renda média × 3) | passar de **30%** |
| Parcelas futuras | soma das parcelas a vencer, por mês | houver parcelas a vencer |
| Regra 50/30/20 | necessidades e desejos (pela `classe` da categoria) e sobra ÷ renda | necessidades > **50%** ou desejos > **30%** |
| Projeção de saldo (3 meses) | renda média − (gasto médio à vista + parcelas já conhecidas do mês) | algum mês ficar negativo |
| Categoria fora da curva | gasto do mês atual × média dos 3 meses anteriores | **20%** acima da média **e** ao menos **R$ 50** a mais |
| Reserva de emergência | saldo das contas com `reserva: true` ÷ gasto médio mensal | cobrir menos de **3 meses** (ou não houver reserva) |

Os limites ficam na constante `LIMITES` em `utils/saudeFinanceira.js` e também são devolvidos no campo `criterios` da resposta. A resposta sempre contém o campo `aviso` informando que as informações são educativas e não constituem recomendação financeira profissional.

## 8. Roteiro da apresentação (10 min)

1. **Código:** estrutura de pastas, `schema.sql`, `models/Usuario.js` (transação), `routes/lancamentos.js`, `middleware/auth.js`.
2. **Linha de comando:** `npm install` → `npm run db:reset` → `npm run dev`.
3. **Unicidade:** pasta *1. Autenticação* — cadastro (201), mesmo e-mail em maiúsculas (409), mesmo CPF sem pontuação (409).
4. **Login e proteção:** login, requisição sem token (401) e ler/alterar/excluir o lançamento **56** (do Bruno) com o token da Ana (404).
5. **CRUD:** pastas 2, 3 e 4 — inclui a compra parcelada (Mochila, 3× no Visa) e a saída com categoria de entrada (400).
6. **Relatórios:** pasta 5 — na previsão de faturas, mostrar onde caiu cada parcela da Mochila e do Notebook.
7. **Desafio:** pasta 6.

## 9. Checklist

- [x] Mesmo e-mail com maiúsculas diferentes → 409
- [x] Mesmo CPF com e sem pontuação → 409
- [x] Duplicatas barradas pelo banco, sem `SELECT` prévio
- [x] Nenhuma resposta contém `senha_hash`
- [x] Sem token ou com token expirado → 401 em JSON
- [x] Trocar o id na URL não dá acesso a dados de outro usuário
- [x] Saída não aceita categoria de entrada
- [x] R$ 100,00 em 3× soma exatamente R$ 100,00
- [x] Compra no dia do fechamento vai para a fatura seguinte
- [x] Relatórios devolvem números, não textos
- [x] `.env` fora do repositório; `.env.example` dentro
