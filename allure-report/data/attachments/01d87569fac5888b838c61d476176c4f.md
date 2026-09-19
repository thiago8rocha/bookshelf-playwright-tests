# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e7]:
    - button "Ativar modo escuro" [ref=e8] [cursor=pointer]:
      - img [ref=e9]
    - group "Idioma" [ref=e11]:
      - button "PT" [pressed] [ref=e12] [cursor=pointer]
      - button "EN" [ref=e13] [cursor=pointer]
  - generic [ref=e14]:
    - generic [ref=e15]:
      - img [ref=e18]
      - heading "BookShelf" [level=1] [ref=e21]
      - paragraph [ref=e22]: Sua biblioteca pessoal na nuvem
    - generic [ref=e23]:
      - generic [ref=e24]:
        - generic [ref=e25]: E-mail
        - generic [ref=e26]:
          - img
          - textbox "E-mail para login" [ref=e27]:
            - /placeholder: seu@email.com
      - generic [ref=e28]:
        - generic [ref=e29]: Senha
        - generic [ref=e30]:
          - img
          - textbox "Senha para login" [ref=e31]:
            - /placeholder: ••••••••
      - button "Entrar" [ref=e32] [cursor=pointer]
    - paragraph [ref=e34]:
      - text: Não tem uma conta?
      - link "Cadastre-se grátis" [ref=e35] [cursor=pointer]:
        - /url: /register
```