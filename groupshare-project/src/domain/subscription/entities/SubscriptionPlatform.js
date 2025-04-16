const { Entity } = require('../../shared/Entity');
const { Id } = require('../../shared/value-objects/Id');

/**
 * Subscription platform entity
 * @extends Entity
 */
class SubscriptionPlatform extends Entity {
  /**
   * @param {Id} id - Platform ID
   * @param {string} name - Platform name
   * @param {string} icon - Platform icon URL
   * @param {boolean} active - Whether the platform is active
   * @private
   */
  constructor(id, name, icon, active) {
    super();
    this._id = id;
    this._name = name;
    this._icon = icon;
    this._active = active;
  }
  
  /**
   * Create a new subscription platform
   * @param {Id} id - Platform ID
   * @param {string} name - Platform name
   * @param {string} icon - Platform icon URL
   * @param {boolean} active - Whether the platform is active
   * @returns {SubscriptionPlatform} A new SubscriptionPlatform instance
   */
  static create(id, name, icon, active = true) {
    return new SubscriptionPlatform(id, name, icon, active);
  }
  
  /**
   * Restore a subscription platform from persistence
   * @param {string} id - Platform ID
   * @param {string} name - Platform name
   * @param {string} icon - Platform icon URL
   * @param {boolean} active - Whether the platform is active
   * @returns {SubscriptionPlatform} A restored SubscriptionPlatform instance
   */
  static restore(id, name, icon, active) {
    return new SubscriptionPlatform(
      Id.from(id),
      name,
      icon,
      active
    );
  }
  
  /**
   * Get the platform ID
   * @returns {string} The platform ID
   */
  get id() {
    return this._id.toString();
  }
  
  /**
   * Get the platform name
   * @returns {string} The platform name
   */
  get name() {
    return this._name;
  }
  
  /**
   * Get the platform icon URL
   * @returns {string} The platform icon URL
   */
  get icon() {
    return this._icon;
  }
  
  /**
   * Check if the platform is active
   * @returns {boolean} True if active
   */
  get isActive() {
    return this._active;
  }
  
  /**
   * Activate the platform
   * @returns {void}
   */
  activate() {
    this._active = true;
  }
  
  /**
   * Deactivate the platform
   * @returns {void}
   */
  deactivate() {
    this._active = false;
  }
}