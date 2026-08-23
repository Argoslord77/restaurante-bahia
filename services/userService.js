//userService.js
const UserModel = require('../models/userModel');

class UserService {

    async getAllUsers() {
        return await UserModel.getAll();
    }

    async getUserById(id) {
        if (!id) {
            throw new Error('ID de usuario requerido');
        }

        return await UserModel.getById(id);
    }

    async createUser(userData) {

        if (!userData.nombre) {
            throw new Error('El nombre es obligatorio');
        }

        if (!userData.usuario) {
            throw new Error('El usuario es obligatorio');
        }

        return await UserModel.create(userData);
    }

    async updateUser(id, userData) {

        if (!id) {
            throw new Error('ID requerido');
        }

        return await UserModel.update(id, userData);
    }

    async deleteUser(id) {

        if (!id) {
            throw new Error('ID requerido');
        }

        return await UserModel.delete(id);
    }

    async changeUserStatus(id, estado) {

        return await UserModel.update(id, {
            estado
        });
    }

}

module.exports = new UserService();