# Requisições de teste (curl)

Todas as rotas da API, na ordem do roteiro de apresentação. A mesma sequência está na coleção do Postman
(`testes/api-financas.postman_collection.json`), que já salva o token sozinha.

**Antes de começar:** `npm run db:reset` e `npm run dev`.

Os comandos usam sintaxe de **bash** (Linux, macOS ou **Git Bash** no Windows — o terminal "Git Bash" do VS Code).
No PowerShell, troque `\` por `` ` `` no fim das linhas, ou use o Postman.

## Guardando os tokens

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@email.com","senha":"Senha123"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

TOKEN_BRUNO=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bruno@email.com","senha":"Senha123"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

echo $TOKEN
```

> Nos comandos abaixo, `CATEGORIA_ID`, `CARTAO_ID`, `LANCAMENTO_ID` e `PARCELADO_ID` são os ids devolvidos
> pelas requisições de criação correspondentes — substitua pelo número que aparecer na resposta.

## 1. Autenticação

### Cadastro (Carla) — 201

Se você já rodou antes, o resultado será 409 (Carla já existe). Rode `npm run db:reset` para recomeçar.

```bash
curl -i -X POST "http://localhost:3000/auth/cadastro" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Carla Mendes","email":"carla@email.com","cpf":"111.444.777-35","senha":"Segura2026"}'
```
Esperado: `201`

### Cadastro com MESMO e-mail em maiúsculas — 409

```bash
curl -i -X POST "http://localhost:3000/auth/cadastro" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Carla 2","email":"  CARLA@Email.com ","cpf":"123.456.789-09","senha":"Segura2026"}'
```
Esperado: `409`

### Cadastro com MESMO CPF sem pontuação — 409

```bash
curl -i -X POST "http://localhost:3000/auth/cadastro" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Carla 3","email":"outra@email.com","cpf":"11144477735","senha":"Segura2026"}'
```
Esperado: `409`

### Cadastro inválido (CPF, e-mail e senha) — 400

```bash
curl -i -X POST "http://localhost:3000/auth/cadastro" \
  -H "Content-Type: application/json" \
  -d '{"nome":"","email":"sem-arroba","cpf":"529.982.247-24","senha":"abc"}'
```
Esperado: `400`

### Login Ana — 200

```bash
curl -i -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@email.com","senha":"Senha123"}'
```
Esperado: `200`

### Login Bruno — 200

```bash
curl -i -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"bruno@email.com","senha":"Senha123"}'
```
Esperado: `200`

### Login com senha errada — 401 (mensagem genérica)

```bash
curl -i -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@email.com","senha":"errada123"}'
```
Esperado: `401`

### Meus dados (/auth/me) — 200

```bash
curl -i -X GET "http://localhost:3000/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `200`

### Requisição SEM token — 401

```bash
curl -i -X GET "http://localhost:3000/lancamentos"
```
Esperado: `401`

### Token inválido — 401

```bash
curl -i -X GET "http://localhost:3000/lancamentos" \
  -H "Authorization: Bearer abc.def.ghi"
```
Esperado: `401`

## 2. Categorias

### Listar categorias

```bash
curl -i -X GET "http://localhost:3000/categorias" \
  -H "Authorization: Bearer $TOKEN"
```

### Listar só saídas

```bash
curl -i -X GET "http://localhost:3000/categorias?tipo=saida" \
  -H "Authorization: Bearer $TOKEN"
```

### Criar categoria — 201

```bash
curl -i -X POST "http://localhost:3000/categorias" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Assinaturas","tipo":"saida","classe":"desejo"}'
```
Esperado: `201`

### Criar categoria repetida — 409

```bash
curl -i -X POST "http://localhost:3000/categorias" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Assinaturas","tipo":"saida"}'
```
Esperado: `409`

### Criar categoria com tipo inválido — 400

```bash
curl -i -X POST "http://localhost:3000/categorias" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","tipo":"gasto"}'
```
Esperado: `400`

### Atualizar categoria — 200

```bash
curl -i -X PUT "http://localhost:3000/categorias/CATEGORIA_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Streaming e assinaturas","tipo":"saida","classe":"desejo"}'
```
Esperado: `200`

### Atualizar categoria de OUTRO usuário — 404

A categoria 10 é do Bruno.

```bash
curl -i -X PUT "http://localhost:3000/categorias/10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Invasão","tipo":"entrada"}'
```
Esperado: `404`

### Excluir categoria com lançamentos — 409

```bash
curl -i -X DELETE "http://localhost:3000/categorias/3" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `409`

### Excluir categoria — 204

```bash
curl -i -X DELETE "http://localhost:3000/categorias/CATEGORIA_ID" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `204`

## 3. Fontes e destinos

### Listar fontes/destinos

```bash
curl -i -X GET "http://localhost:3000/fontes-destinos" \
  -H "Authorization: Bearer $TOKEN"
```

### Listar só cartões

```bash
curl -i -X GET "http://localhost:3000/fontes-destinos?tipo=cartao_credito" \
  -H "Authorization: Bearer $TOKEN"
```

### Criar cartão SEM fechamento/vencimento/limite — 400

```bash
curl -i -X POST "http://localhost:3000/fontes-destinos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cartão C6","tipo":"cartao_credito"}'
```
Esperado: `400`

### Criar cartão — 201

```bash
curl -i -X POST "http://localhost:3000/fontes-destinos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cartão C6","tipo":"cartao_credito","diaFechamento":31,"diaVencimento":8,"limite":2000}'
```
Esperado: `201`

### Criar com tipo inválido — 400

```bash
curl -i -X POST "http://localhost:3000/fontes-destinos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Carteira","tipo":"dinheiro"}'
```
Esperado: `400`

### Criar nome repetido — 409

```bash
curl -i -X POST "http://localhost:3000/fontes-destinos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Poupança","tipo":"conta"}'
```
Esperado: `409`

### Atualizar cartão — 200

```bash
curl -i -X PUT "http://localhost:3000/fontes-destinos/CARTAO_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cartão C6 Black","tipo":"cartao_credito","diaFechamento":28,"diaVencimento":5,"limite":2500}'
```
Esperado: `200`

### Excluir fonte com lançamentos — 409

```bash
curl -i -X DELETE "http://localhost:3000/fontes-destinos/3" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `409`

### Excluir cartão — 204

```bash
curl -i -X DELETE "http://localhost:3000/fontes-destinos/CARTAO_ID" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `204`

## 4. Lançamentos

### Listar (padrão: mês corrente)

```bash
curl -i -X GET "http://localhost:3000/lancamentos" \
  -H "Authorization: Bearer $TOKEN"
```

### Listar outubro, só saídas, página 1

```bash
curl -i -X GET "http://localhost:3000/lancamentos?inicio=2026-10-01&fim=2026-10-31&tipo=saida&pagina=1" \
  -H "Authorization: Bearer $TOKEN"
```

### Listar por categoria e fonte/destino

```bash
curl -i -X GET "http://localhost:3000/lancamentos?inicio=2026-08-01&fim=2026-11-30&categoriaId=3&fonteDestinoId=3" \
  -H "Authorization: Bearer $TOKEN"
```

### Listar com data inválida — 400

```bash
curl -i -X GET "http://localhost:3000/lancamentos?inicio=2026-02-30" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `400`

### Detalhar lançamento

```bash
curl -i -X GET "http://localhost:3000/lancamentos/1" \
  -H "Authorization: Bearer $TOKEN"
```

### Criar lançamento simples — 201

```bash
curl -i -X POST "http://localhost:3000/lancamentos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"saida","descricao":"Padaria","valor":23.5,"data":"2026-11-06","categoriaId":3,"fonteDestinoId":1}'
```
Esperado: `201`

### Criar compra PARCELADA (R$ 100 em 3× no Visa) — 201

```bash
curl -i -X POST "http://localhost:3000/lancamentos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"saida","descricao":"Mochila","valor":100,"data":"2026-11-06","categoriaId":9,"fonteDestinoId":4,"parcelas":3}'
```
Esperado: `201`

### Saída com categoria de ENTRADA — 400

```bash
curl -i -X POST "http://localhost:3000/lancamentos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"saida","descricao":"Errado","valor":50,"data":"2026-11-06","categoriaId":1,"fonteDestinoId":1}'
```
Esperado: `400`

### Valor negativo e data inválida — 400

```bash
curl -i -X POST "http://localhost:3000/lancamentos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"saida","descricao":"Errado","valor":-10,"data":"06/11/2026","categoriaId":3,"fonteDestinoId":1}'
```
Esperado: `400`

### Parcelar fora do cartão — 400

```bash
curl -i -X POST "http://localhost:3000/lancamentos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"saida","descricao":"Geladeira","valor":2000,"data":"2026-11-06","categoriaId":4,"fonteDestinoId":1,"parcelas":5}'
```
Esperado: `400`

### Usar categoria de OUTRO usuário — 404

A categoria 12 é do Bruno.

```bash
curl -i -X POST "http://localhost:3000/lancamentos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"saida","descricao":"Teste","valor":10,"data":"2026-11-06","categoriaId":12,"fonteDestinoId":1}'
```
Esperado: `404`

### Atualizar lançamento — 200

```bash
curl -i -X PUT "http://localhost:3000/lancamentos/LANCAMENTO_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"saida","descricao":"Padaria e café","valor":31.9,"data":"2026-11-06","categoriaId":3,"fonteDestinoId":1}'
```
Esperado: `200`

### Ler lançamento de OUTRO usuário — 404

O lançamento 56 é do Bruno.

```bash
curl -i -X GET "http://localhost:3000/lancamentos/56" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `404`

### Alterar lançamento de OUTRO usuário — 404

```bash
curl -i -X PUT "http://localhost:3000/lancamentos/56" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"entrada","descricao":"Invasão","valor":1,"data":"2026-11-06","categoriaId":1,"fonteDestinoId":2}'
```
Esperado: `404`

### Excluir lançamento de OUTRO usuário — 404

```bash
curl -i -X DELETE "http://localhost:3000/lancamentos/56" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `404`

### Bruno lê o próprio lançamento 56 — 200

```bash
curl -i -X GET "http://localhost:3000/lancamentos/56" \
  -H "Authorization: Bearer $TOKEN_BRUNO"
```
Esperado: `200`

## 5. Relatórios

### Por categoria (outubro × setembro)

```bash
curl -i -X GET "http://localhost:3000/relatorios/categorias?inicio=2026-10-01&fim=2026-10-31" \
  -H "Authorization: Bearer $TOKEN"
```

### Por categoria sem período — 400

```bash
curl -i -X GET "http://localhost:3000/relatorios/categorias" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `400`

### Por categoria com início > fim — 400

```bash
curl -i -X GET "http://localhost:3000/relatorios/categorias?inicio=2026-10-31&fim=2026-10-01" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `400`

### Por fonte/destino (outubro)

```bash
curl -i -X GET "http://localhost:3000/relatorios/fontes-destinos?inicio=2026-10-01&fim=2026-10-31" \
  -H "Authorization: Bearer $TOKEN"
```

### Previsão de faturas (3 meses)

Mostra em qual fatura caiu cada parcela da "Mochila" (3×) e do "Notebook" (10×).

```bash
curl -i -X GET "http://localhost:3000/relatorios/faturas?meses=3" \
  -H "Authorization: Bearer $TOKEN"
```

### Previsão de faturas com meses=13 — 400

```bash
curl -i -X GET "http://localhost:3000/relatorios/faturas?meses=13" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `400`

## 6. Desafio — Saúde financeira

### Saúde financeira

```bash
curl -i -X GET "http://localhost:3000/saude-financeira" \
  -H "Authorization: Bearer $TOKEN"
```

## 7. Exclusões de lançamentos

### Excluir TODAS as parcelas da compra — 204

```bash
curl -i -X DELETE "http://localhost:3000/lancamentos/PARCELADO_ID?todasParcelas=true" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `204`

### Excluir lançamento simples — 204

```bash
curl -i -X DELETE "http://localhost:3000/lancamentos/LANCAMENTO_ID" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `204`

### Rota inexistente — 404

```bash
curl -i -X GET "http://localhost:3000/nao-existe" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: `404`
