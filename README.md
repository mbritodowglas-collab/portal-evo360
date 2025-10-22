# 🧠 portal-evo360

**Portal do Aluno EVO360** — App web estático (PWA) com níveis de evolução física e mental, check-in inteligente e ferramentas de autogestão (hábitos, recompensas e visualização mental).

---

### 💡 Sobre o projeto

O **EVO360** é uma plataforma educacional e comportamental que guia o aluno em um processo de evolução física e mental dividido em fases:  
**Fundação, Ascensão, Domínio, OverPrime e OverLord.**

O sistema funciona inteiramente no navegador — sem backend — e salva o progresso localmente.

---

### ⚙️ Funcionalidades principais

📅 **Conteúdo diário gotejado (Drip System)**  
🧩 **Habit Tracker fixo + hábitos personalizados**  
🎯 **Trilha de Recompensas** com metas e gratificações pessoais  
🧘‍♀️ **Visualização Mental Guiada**  
📊 **Check-in Diário Inteligente** com análise automática e recomendação de treino  
📲 **Instalável (PWA)** — compatível com Android e iOS, funcionando offline após o primeiro acesso  

---

### 🧰 Recursos técnicos

- HTML, CSS e JavaScript puro (**sem backend**)  
- PWA com manifests individuais por nível  
- Geração automática de slugs aleatórios e páginas privadas (`scripts/gen_slugs.py`)  
- Armazenamento local de progresso (`localStorage`)  
- Layouts temáticos para cada fase de evolução  
- Totalmente compatível com **GitHub Pages**

---

### 🧩 Estrutura dos níveis

| Linha Bella Prime | Foco |
|--------------------|------|
| Fundação | Consistência e autocuidado |
| Ascensão | Consolidação de hábitos e progresso físico |
| Domínio | Autonomia e domínio corporal |
| OverPrime | Performance e mentalidade de elite |

| Linha OverLord | Foco |
|----------------|------|
| Mind Stage | Clareza e foco mental |
| Body Stage | Disciplina e consistência física |
| OverCore | Força e reconstrução |
| OverLord | Autodomínio total |

---

### 🚀 Como usar

1. Clone ou importe o repositório `portal-evo360`.  
2. Execute o gerador de slugs:
   ```bash
   python3 scripts/gen_slugs.py
