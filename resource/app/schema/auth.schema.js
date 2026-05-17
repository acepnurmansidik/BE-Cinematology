const Authchema = {
  Register: {
    BodyAuthRegisterSchema: {
      username: "john doe",
      email: "john.doe@gmail.com",
      password: "123456",
      guest_id: "6a09221b951d3cce35365c1f",
    },
  },
  Login: {
    BodyAuthLoginSchema: {
      email: "superadmin@mail.com",
      password: "password123",
      guest_id: "6a09221b951d3cce35365c1f",
    },
  },
  ForgotPassword: {
    BodyAuthForgotSchema: {
      email: "superadmin@mail.com",
      password: "password123",
      confirm_password: "password123",
    },
  },
};

module.exports = Authchema;
