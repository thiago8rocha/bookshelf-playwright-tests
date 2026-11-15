@auth @ui
Feature: Login
  A registered user signs in with email and password; anyone else stays on the login page.

  Background:
    Given the login page is open

  @smoke
  Scenario: Registered user signs in
    Given a registered user
    When the user signs in with the right credentials
    Then the dashboard is shown

  @regression
  Scenario: Unregistered email is rejected
    When the user signs in with an unregistered email
    Then the user stays on the login page

  @regression
  Scenario: Wrong password is rejected
    Given a registered user
    When the user signs in with a wrong password
    Then the user stays on the login page

  @regression
  Scenario: Empty email is blocked
    When the user submits only a password
    Then the user stays on the login page

  @regression
  Scenario: Empty password is blocked
    When the user submits only an email
    Then the user stays on the login page

  @regression
  Scenario: Malformed email is blocked
    When the user submits a malformed email
    Then the user stays on the login page
