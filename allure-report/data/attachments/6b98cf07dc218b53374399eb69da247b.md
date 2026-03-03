# Page snapshot

```yaml
- generic [ref=e7]:
  - generic [ref=e8]:
    - img [ref=e11]
    - heading "Criar Conta" [level=1] [ref=e14]
    - paragraph [ref=e15]: Comece sua biblioteca digital hoje
  - generic [ref=e16]:
    - generic [ref=e17]:
      - generic [ref=e18]: Nome Completo
      - generic [ref=e19]:
        - img
        - textbox "Nome completo" [ref=e20]:
          - /placeholder: João Silva
    - generic [ref=e21]:
      - generic [ref=e22]: E-mail
      - generic [ref=e23]:
        - img
        - textbox "E-mail para cadastro" [ref=e24]:
          - /placeholder: seu@email.com
    - generic [ref=e25]:
      - generic [ref=e26]: Senha
      - generic [ref=e27]:
        - img
        - textbox "Senha (mínimo 6 caracteres)" [ref=e28]:
          - /placeholder: ••••••••
      - paragraph [ref=e29]: Mínimo 6 caracteres
    - button "Criar Conta Grátis" [ref=e30] [cursor=pointer]
  - paragraph [ref=e32]:
    - text: Já tem uma conta?
    - link "Entrar" [ref=e33] [cursor=pointer]:
      - /url: /login
```