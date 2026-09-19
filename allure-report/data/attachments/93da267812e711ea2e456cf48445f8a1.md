# Page snapshot

```yaml
- generic [ref=e3]:
  - group "language.label" [ref=e8]:
    - button "language.ptBR" [pressed] [ref=e9] [cursor=pointer]
    - button "language.en" [ref=e10] [cursor=pointer]
  - generic [ref=e11]:
    - generic [ref=e12]:
      - img [ref=e15]
      - heading "common.appName" [level=1] [ref=e18]
      - paragraph [ref=e19]: login.subtitle
    - generic [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]: common.email
        - generic [ref=e23]:
          - img
          - textbox "login.emailAriaLabel" [ref=e24]:
            - /placeholder: common.emailPlaceholder
      - generic [ref=e25]:
        - generic [ref=e26]: common.password
        - generic [ref=e27]:
          - img
          - textbox "login.passwordAriaLabel" [ref=e28]:
            - /placeholder: common.passwordPlaceholder
      - button "login.submit" [ref=e29] [cursor=pointer]
    - paragraph [ref=e31]:
      - text: login.noAccount
      - link "login.signUp" [ref=e32] [cursor=pointer]:
        - /url: /register
```