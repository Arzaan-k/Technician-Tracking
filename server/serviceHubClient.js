/**
 * Service Hub Authentication Client
 * Handles all authentication requests to Service Hub (single source of truth)
 */

import axios from 'axios';

const SERVICE_HUB_URL = process.env.SERVICE_HUB_URL || 'http://localhost:5000';

class ServiceHubClient {
    constructor() {
        this.baseURL = SERVICE_HUB_URL;
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Login user via Service Hub
     * @param {string} email - User email or phone
     * @param {string} password - User password
     * @returns {Promise<{token: string, user: object}>}
     */
    async login(email, password) {
        try {
            const response = await this.client.post('/auth/login', {
                email,
                password
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                // Service Hub returned an error response
                throw new Error(error.response.data.error || 'Authentication failed');
            } else if (error.request) {
                // Request was made but no response received
                throw new Error('Service Hub is unreachable. Please try again later.');
            } else {
                // Something else happened
                throw new Error('Authentication request failed');
            }
        }
    }

    /**
     * Validate JWT token via Service Hub
     * @param {string} token - JWT token to validate
     * @returns {Promise<object>} User information
     */
    async validateToken(token) {
        try {
            const response = await this.client.get('/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(error.response.data.error || 'Token validation failed');
            } else {
                throw new Error('Service Hub is unreachable');
            }
        }
    }

    /**
     * Get user information by ID
     * @param {number} userId - User ID
     * @param {string} token - JWT token for authorization
     * @returns {Promise<object>} User information
     */
    async getUserById(userId, token) {
        try {
            const response = await this.client.get(`/auth/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(error.response.data.error || 'Failed to fetch user');
            } else {
                throw new Error('Service Hub is unreachable');
            }
        }
    }

    /**
     * Check if Service Hub is available
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health', { timeout: 3000 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}

// Export singleton instance
const serviceHubClient = new ServiceHubClient();
export default serviceHubClient;
