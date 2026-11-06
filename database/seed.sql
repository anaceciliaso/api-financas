-- Dados de demonstração (gerados a partir de um script; valores das parcelas já divididos em centavos).
-- Pré-requisito: executar o schema.sql antes.
--
-- Usuários (senha de ambos: Senha123 — hash gerado com bcrypt, custo 10):
--   Ana Souza  — ana@email.com   — CPF 529.982.247-25 — lançamentos 1 a 55
--   Bruno Lima — bruno@email.com — CPF 987.654.321-00 — lançamentos 56 a 74
--
-- Destaques para a demonstração (Ana):
--   * Cartão Nubank (fecha dia 3, vence dia 10) e Visa crédito (fecha dia 25, vence dia 5)
--   * Notebook R$ 3.000,00 em 10× no Nubank (28/10/2026)
--   * Fone de ouvido R$ 100,00 em 3× no Visa (20/09/2026) → 33,34 + 33,33 + 33,33
--   * Compra no Nubank exatamente no dia do fechamento (03/11/2026) → cai na fatura de dezembro
--   * Poupança marcada como reserva de emergência
SET NAMES utf8mb4;
USE api_financas;

INSERT INTO usuarios (id, nome, email, cpf, senha_hash) VALUES
  (1, 'Ana Souza', 'ana@email.com', '52998224725', '$2b$10$SMiQ8FTJC05SlVxsd5eSy.39.j0kPHI4O1wWGr9LRVSTppn7zdWlu'),
  (2, 'Bruno Lima', 'bruno@email.com', '98765432100', '$2b$10$SMiQ8FTJC05SlVxsd5eSy.39.j0kPHI4O1wWGr9LRVSTppn7zdWlu');

INSERT INTO categorias (id, usuario_id, nome, tipo, classe) VALUES
  (1, 1, 'Salário', 'entrada', NULL),
  (2, 1, 'Outras entradas', 'entrada', NULL),
  (3, 1, 'Alimentação', 'saida', 'necessidade'),
  (4, 1, 'Moradia', 'saida', 'necessidade'),
  (5, 1, 'Saúde', 'saida', 'necessidade'),
  (6, 1, 'Mobilidade', 'saida', 'necessidade'),
  (7, 1, 'Lazer', 'saida', 'desejo'),
  (8, 1, 'Educação', 'saida', 'necessidade'),
  (9, 1, 'Outras saídas', 'saida', 'desejo'),
  (10, 2, 'Salário', 'entrada', NULL),
  (11, 2, 'Outras entradas', 'entrada', NULL),
  (12, 2, 'Alimentação', 'saida', 'necessidade'),
  (13, 2, 'Moradia', 'saida', 'necessidade'),
  (14, 2, 'Saúde', 'saida', 'necessidade'),
  (15, 2, 'Mobilidade', 'saida', 'necessidade'),
  (16, 2, 'Lazer', 'saida', 'desejo'),
  (17, 2, 'Educação', 'saida', 'necessidade'),
  (18, 2, 'Outras saídas', 'saida', 'desejo');

INSERT INTO fontes_destinos (id, usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva) VALUES
  (1, 1, 'Conta corrente', 'conta', NULL, NULL, NULL, FALSE),
  (2, 1, 'Salário ACME', 'renda', NULL, NULL, NULL, FALSE),
  (3, 1, 'Cartão Nubank', 'cartao_credito', 3, 10, 6000, FALSE),
  (4, 1, 'Visa crédito', 'cartao_credito', 25, 5, 3000, FALSE),
  (5, 1, 'Poupança', 'conta', NULL, NULL, NULL, TRUE),
  (6, 1, 'Freelance', 'renda', NULL, NULL, NULL, FALSE),
  (7, 2, 'Conta corrente', 'conta', NULL, NULL, NULL, FALSE),
  (8, 2, 'Salário', 'renda', NULL, NULL, NULL, FALSE),
  (9, 2, 'Cartão Inter', 'cartao_credito', 15, 22, 2500, FALSE);

INSERT INTO lancamentos (id, usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
                         parcela_atual, total_parcelas, grupo_parcelamento) VALUES
  (1, 1, 'entrada', 'Saldo inicial da poupança', 8000, '2026-07-31', 2, 5, 1, 1, NULL),
  (2, 1, 'entrada', 'Salário', 5200, '2026-08-05', 1, 2, 1, 1, NULL),
  (3, 1, 'saida', 'Aluguel', 1500, '2026-08-10', 4, 1, 1, 1, NULL),
  (4, 1, 'saida', 'Conta de luz', 168.42, '2026-08-15', 4, 1, 1, 1, NULL),
  (5, 1, 'saida', 'Supermercado', 412.3, '2026-08-07', 3, 3, 1, 1, NULL),
  (6, 1, 'saida', 'Supermercado', 286.75, '2026-08-21', 3, 3, 1, 1, NULL),
  (7, 1, 'saida', 'Restaurante', 96.4, '2026-08-17', 3, 4, 1, 1, NULL),
  (8, 1, 'saida', 'Uber', 74.2, '2026-08-12', 6, 3, 1, 1, NULL),
  (9, 1, 'saida', 'Combustível', 210, '2026-08-19', 6, 1, 1, 1, NULL),
  (10, 1, 'saida', 'Farmácia', 58.9, '2026-08-23', 5, 3, 1, 1, NULL),
  (11, 1, 'saida', 'Cinema e lazer', 120, '2026-08-26', 7, 4, 1, 1, NULL),
  (12, 1, 'entrada', 'Rendimento da poupança', 52.1, '2026-08-28', 2, 5, 1, 1, NULL),
  (13, 1, 'entrada', 'Salário', 5200, '2026-09-05', 1, 2, 1, 1, NULL),
  (14, 1, 'saida', 'Aluguel', 1500, '2026-09-10', 4, 1, 1, 1, NULL),
  (15, 1, 'saida', 'Conta de luz', 181.07, '2026-09-15', 4, 1, 1, 1, NULL),
  (16, 1, 'saida', 'Supermercado', 398.1, '2026-09-07', 3, 3, 1, 1, NULL),
  (17, 1, 'saida', 'Supermercado', 301.55, '2026-09-21', 3, 3, 1, 1, NULL),
  (18, 1, 'saida', 'Restaurante', 132.8, '2026-09-17', 3, 4, 1, 1, NULL),
  (19, 1, 'saida', 'Uber', 88.6, '2026-09-12', 6, 3, 1, 1, NULL),
  (20, 1, 'saida', 'Combustível', 195.5, '2026-09-19', 6, 1, 1, 1, NULL),
  (21, 1, 'saida', 'Farmácia', 142.3, '2026-09-23', 5, 3, 1, 1, NULL),
  (22, 1, 'saida', 'Cinema e lazer', 89.9, '2026-09-26', 7, 4, 1, 1, NULL),
  (23, 1, 'entrada', 'Rendimento da poupança', 53.4, '2026-09-28', 2, 5, 1, 1, NULL),
  (24, 1, 'entrada', 'Salário', 5200, '2026-10-05', 1, 2, 1, 1, NULL),
  (25, 1, 'saida', 'Aluguel', 1500, '2026-10-10', 4, 1, 1, 1, NULL),
  (26, 1, 'saida', 'Conta de luz', 175.33, '2026-10-15', 4, 1, 1, 1, NULL),
  (27, 1, 'saida', 'Supermercado', 455.2, '2026-10-07', 3, 3, 1, 1, NULL),
  (28, 1, 'saida', 'Supermercado', 342.9, '2026-10-21', 3, 3, 1, 1, NULL),
  (29, 1, 'saida', 'Restaurante', 182.4, '2026-10-17', 3, 4, 1, 1, NULL),
  (30, 1, 'saida', 'Uber', 102.3, '2026-10-12', 6, 3, 1, 1, NULL),
  (31, 1, 'saida', 'Combustível', 220, '2026-10-19', 6, 1, 1, 1, NULL),
  (32, 1, 'saida', 'Farmácia', 64.5, '2026-10-23', 5, 3, 1, 1, NULL),
  (33, 1, 'saida', 'Cinema e lazer', 260, '2026-10-26', 7, 4, 1, 1, NULL),
  (34, 1, 'entrada', 'Rendimento da poupança', 54.85, '2026-10-28', 2, 5, 1, 1, NULL),
  (35, 1, 'saida', 'Curso de inglês', 289, '2026-08-08', 8, 1, 1, 1, NULL),
  (36, 1, 'saida', 'Curso de inglês', 289, '2026-09-08', 8, 1, 1, 1, NULL),
  (37, 1, 'saida', 'Curso de inglês', 289, '2026-10-08', 8, 1, 1, 1, NULL),
  (38, 1, 'saida', 'Fone de ouvido', 33.34, '2026-09-20', 9, 4, 1, 3, 'a1b2c3d4-0000-4000-8000-000000000001'),
  (39, 1, 'saida', 'Fone de ouvido', 33.33, '2026-09-20', 9, 4, 2, 3, 'a1b2c3d4-0000-4000-8000-000000000001'),
  (40, 1, 'saida', 'Fone de ouvido', 33.33, '2026-09-20', 9, 4, 3, 3, 'a1b2c3d4-0000-4000-8000-000000000001'),
  (41, 1, 'entrada', 'Projeto freelance', 800, '2026-10-14', 2, 6, 1, 1, NULL),
  (42, 1, 'saida', 'Notebook', 300, '2026-10-28', 8, 3, 1, 10, 'a1b2c3d4-0000-4000-8000-000000000002'),
  (43, 1, 'saida', 'Notebook', 300, '2026-10-28', 8, 3, 2, 10, 'a1b2c3d4-0000-4000-8000-000000000002'),
  (44, 1, 'saida', 'Notebook', 300, '2026-10-28', 8, 3, 3, 10, 'a1b2c3d4-0000-4000-8000-000000000002'),
  (45, 1, 'saida', 'Notebook', 300, '2026-10-28', 8, 3, 4, 10, 'a1b2c3d4-0000-4000-8000-000000000002'),
  (46, 1, 'saida', 'Notebook', 300, '2026-10-28', 8, 3, 5, 10, 'a1b2c3d4-0000-4000-8000-000000000002'),
  (47, 1, 'saida', 'Notebook', 300, '2026-10-28', 8, 3, 6, 10, 'a1b2c3d4-0000-4000-8000-000000000002'),
  (48, 1, 'saida', 'Notebook', 300, '2026-10-28', 8, 3, 7, 10, 'a1b2c3d4-0000-4000-8000-000000000002'),
  (49, 1, 'saida', 'Notebook', 300, '2026-10-28', 8, 3, 8, 10, 'a1b2c3d4-0000-4000-8000-000000000002'),
  (50, 1, 'saida', 'Notebook', 300, '2026-10-28', 8, 3, 9, 10, 'a1b2c3d4-0000-4000-8000-000000000002'),
  (51, 1, 'saida', 'Notebook', 300, '2026-10-28', 8, 3, 10, 10, 'a1b2c3d4-0000-4000-8000-000000000002'),
  (52, 1, 'saida', 'Supermercado', 250, '2026-11-02', 3, 3, 1, 1, NULL),
  (53, 1, 'saida', 'Farmácia', 89.9, '2026-11-03', 5, 3, 1, 1, NULL),
  (54, 1, 'entrada', 'Salário', 5200, '2026-11-05', 1, 2, 1, 1, NULL),
  (55, 1, 'saida', 'Restaurante', 310.5, '2026-11-05', 3, 4, 1, 1, NULL),
  (56, 2, 'entrada', 'Salário', 3000, '2026-08-05', 10, 8, 1, 1, NULL),
  (57, 2, 'saida', 'Aluguel', 900, '2026-08-06', 13, 7, 1, 1, NULL),
  (58, 2, 'saida', 'Mercado', 520, '2026-08-14', 12, 9, 1, 1, NULL),
  (59, 2, 'saida', 'Ônibus', 150, '2026-08-02', 15, 7, 1, 1, NULL),
  (60, 2, 'entrada', 'Salário', 3000, '2026-09-05', 10, 8, 1, 1, NULL),
  (61, 2, 'saida', 'Aluguel', 900, '2026-09-06', 13, 7, 1, 1, NULL),
  (62, 2, 'saida', 'Mercado', 520, '2026-09-14', 12, 9, 1, 1, NULL),
  (63, 2, 'saida', 'Ônibus', 150, '2026-09-02', 15, 7, 1, 1, NULL),
  (64, 2, 'entrada', 'Salário', 3000, '2026-10-05', 10, 8, 1, 1, NULL),
  (65, 2, 'saida', 'Aluguel', 900, '2026-10-06', 13, 7, 1, 1, NULL),
  (66, 2, 'saida', 'Mercado', 520, '2026-10-14', 12, 9, 1, 1, NULL),
  (67, 2, 'saida', 'Ônibus', 150, '2026-10-02', 15, 7, 1, 1, NULL),
  (68, 2, 'saida', 'Bicicleta', 200, '2026-09-10', 15, 9, 1, 6, 'b1b2c3d4-0000-4000-8000-000000000003'),
  (69, 2, 'saida', 'Bicicleta', 200, '2026-09-10', 15, 9, 2, 6, 'b1b2c3d4-0000-4000-8000-000000000003'),
  (70, 2, 'saida', 'Bicicleta', 200, '2026-09-10', 15, 9, 3, 6, 'b1b2c3d4-0000-4000-8000-000000000003'),
  (71, 2, 'saida', 'Bicicleta', 200, '2026-09-10', 15, 9, 4, 6, 'b1b2c3d4-0000-4000-8000-000000000003'),
  (72, 2, 'saida', 'Bicicleta', 200, '2026-09-10', 15, 9, 5, 6, 'b1b2c3d4-0000-4000-8000-000000000003'),
  (73, 2, 'saida', 'Bicicleta', 200, '2026-09-10', 15, 9, 6, 6, 'b1b2c3d4-0000-4000-8000-000000000003'),
  (74, 2, 'entrada', 'Salário', 3000, '2026-11-05', 10, 8, 1, 1, NULL);
