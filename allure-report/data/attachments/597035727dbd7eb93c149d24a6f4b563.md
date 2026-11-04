# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e7]:
    - combobox "Tema" [ref=e9] [cursor=pointer]:
      - option "Sistema" [selected]
      - option "Claro"
      - option "Escuro"
    - group "Idioma" [ref=e10]:
      - button "PT" [pressed] [ref=e11] [cursor=pointer]
      - button "EN" [ref=e12] [cursor=pointer]
  - generic [ref=e13]:
    - generic [ref=e14]:
      - img [ref=e17]
      - heading "Tsundoku" [level=1] [ref=e20]
      - paragraph [ref=e21]: Sua biblioteca pessoal na nuvem
    - generic [ref=e22]:
      - generic [ref=e23]:
        - generic [ref=e24]: E-mail
        - generic [ref=e25]:
          - img
          - textbox "E-mail para login" [ref=e26]:
            - /placeholder: seu@email.com
      - generic [ref=e27]:
        - generic [ref=e28]: Senha
        - generic [ref=e29]:
          - img
          - textbox "Senha para login" [ref=e30]:
            - /placeholder: ••••••••
      - button "Entrar" [ref=e31] [cursor=pointer]
    - paragraph [ref=e33]:
      - text: Não tem uma conta?
      - link "Cadastre-se grátis" [ref=e34] [cursor=pointer]:
        - /url: /register
```