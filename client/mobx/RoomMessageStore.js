import { observable, action, computed, toJS } from "mobx";
import { AsyncStorage } from 'react-native';
import * as crypto from 'crypto-js';
import { sendRequest, socket } from './NetService';
import authStore from './AuthStore';
import roomStore from "./RoomStore";
const forge = require('node-forge');
const pki = forge.pki;

class ObservableRoomMessageStore {
  @observable roomId = '';
  @observable roomType = '';
  @observable roomKey = '';
  @observable roomMessages = [];

  @observable messagesIsLoading = false;
  @observable messagesIsLoaded = false;
  @observable messagesIsSuccess = false;

  @observable postMessageIsLoading = false;
  @observable postMessageIsSuccess = false;

  @observable allSocketUsers = [];
  @observable joinedSocketUsers = [];
  @observable typingUsers = [];

  @observable establishStandby = false;
  @observable establishIsLoading = false;
  @observable establishIsLoaded = false;
  @observable establishIsSuccess = false;

  @observable requestGroupKeyIsLoading = false;
  @observable requestGroupKeyIsLoaded = false;
  @observable requestGroupKeyError = false;

  constructor(){ }

  @action.bound async initialize() {
    const room = roomStore.getRoom(this.roomId);
    if(this.roomType == 'secure'){
      await this.getRoomKey();
      this.addEstablishListeners();
    } 
    if(this.roomKey || this.roomType == 'nonsecure'){
      await this.getRoomMessages();
    } else if(!this.roomKey && room.locked) {
      this.establishStandby = true;
    } else if(!this.roomKey && !room.locked) {
      await this.requestGroupKeyShare();
    }
    this.joinRoom();
  }

  @action resetEstablish = () => {
    this.roomId = '';
    this.roomType = '';
    this.roomKey = '';
    this.roomMessages = [];

    this.messagesIsLoading = false;
    this.messagesIsLoaded = false;
    this.messagesIsSuccess = false;

    this.postMessageIsLoading = false;
    this.postMessageIsSuccess = false;

    this.allSocketUsers = [];
    this.joinedSocketUsers = [];
    this.typingUsers = [];

    this.establishStandby = false;
    this.establishIsLoading = false;
    this.establishIsLoaded = false;
    this.establishIsSuccess = false;

    this.requestGroupKeyIsLoading = false;
    this.requestGroupKeyIsLoaded = false;
    this.requestGroupKeyError = false;
  }

  @computed get messages() {
    return this.roomMessages;
  }

  @computed get joinedUsers() {
    return this.joinedSocketUsers;
  }
  set joinedUsers(users) {
    this.joinedSocketUsers = users;
  }
  
  @action.bound async getRoomMessages() {    
    const result = await this.fetchGetMessages(this.roomId);
    this.messagesIsSuccess = result.success;
    if(result.success){
      const messages = result.res;
      if(this.roomType == 'secure'){ messages.forEach(m => { m.text = m.senderType == 'system' ? m.text : this.decryptMessage(m.text) }) }
      this.roomMessages = messages.reverse();
    }
    return result;
  }

  @action.bound async postRoomMessage(messageData) {
    const roomId = this.roomId;

    if(this.roomType == 'secure'){ messageData.text = this.encryptMessage(messageData.text) }
    messageData.hash = crypto.MD5(JSON.stringify(messageData)).toString();

    const result = await this.fetchPostMessage(roomId, messageData);
    this.postMessageIsSuccess = result.success;
    if(result.success){
      const message = result.res;
      socket.emit('messageCreate', {message: JSON.stringify(message), roomId});
      socket.emit('roomUpdate', roomId);
    }
    return result
  }

  @action async getRoomKey() {
    this.roomKey = await AsyncStorage.getItem(`room/${this.roomId}/groupKey`);
  }

  @action emitUserTyping(action) {
    const userName = authStore.user.username;
    const roomId = this.roomId;

    socket.emit('roomUserTyping', { roomId, userName, action });
  }

  @action async fetchGetMessages(roomId){
    this.messagesIsLoading = true;

    const url = 'rooms/' + roomId + '/messages';
    const method = 'GET';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `bearer ${authStore.userToken}`
    };

    try {
      let res = await sendRequest(url, method, headers);
      this.messagesIsLoading = false;
      this.messagesIsLoaded = true;
      this.postMessageIsLoading = false;
      return res;
    } catch(err) {
      console.log(err);
    }
  }

  @action async fetchPostMessage(roomId, data){
    this.postMessageIsLoading = true;

    const url = 'rooms/' + roomId + '/messages';
    const method = 'POST';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `bearer ${authStore.userToken}`
    };

    try {
      let res = await sendRequest(url, method, headers, data);
      return res;
    } catch(err) {
      console.log(err);
    }
  }

  @action.bound joinRoom() {
    socket.on('joinedUsers', ({ joinedUsers, allUsers }) => {
      this.joinedUsers = joinedUsers;
      this.allSocketUsers = allUsers;
    });
    socket.on('messageCreate', async message => {
      message = JSON.parse(message);

      if(this.roomType == 'secure' && message.senderType != 'system'){ message.text = this.decryptMessage(message.text) }

      this.roomMessages.unshift(message);
      this.postMessageIsLoading = false;
      
      roomStore.pushRoomToTop(this.roomId);
    });
    socket.on('roomUserTyping', ({ userName, action }) => {
      if(userName != authStore.user.username){
        if(action == 'typingStart' && !this.typingUsers.find(tu => tu == userName)) {
          this.typingUsers.push(userName);
        } else if(action == 'typingEnd') {
          this.typingUsers.splice(this.typingUsers.indexOf(this.typingUsers.find(tu => tu == userName)), 1)
        }
      }
    })

    roomStore.rooms.find(r => r._id == this.roomId).hasUpdate = false;

    socket.emit('roomJoin', {roomId: this.roomId, userId: authStore.user._id});
  }

  @action.bound leaveRoom() {
    socket.emit('roomLeave', this.roomId);
    socket.removeEventListener('messageCreate');
    socket.removeEventListener('joinedUsers');
    socket.removeEventListener('roomUserTyping');
    this.removeEstablishListeners();

    this.roomKey = '';
    this.requestGroupKeyError = false;
    this.roomMessages = [];
  }

  @action addEstablishListeners() {
    socket.on('establish', async data => {
      this.establishIsLoading = true;
      this.establishStandby = false;
      if(data.memberType == 'captureMemberDefault'){
        let userPubKeyPem = await AsyncStorage.getItem('userPubKey');
        socket.emit('establishResponse', userPubKeyPem);
      } else if(data.memberType == 'captureMemberLast'){
        let groupKey = await this.generateGroupKey();
        let encryptedKeys = await this.encryptGroupKey(groupKey, data.publicKeys);
        socket.emit('establishResponse', encryptedKeys);
      } else if(data.memberType == 'shareMember') {
        let groupKey = this.roomKey;
        let pubKey = pki.publicKeyFromPem(data.publicKeyPem);
        let encGroupKey = pubKey.encrypt(groupKey);
        socket.emit('establishResponse', encGroupKey);
      }
    })
    socket.on('groupKey', async key => {
      let userPrivateKey = await AsyncStorage.getItem('userSecKey');
      let privateKey = pki.privateKeyFromPem(userPrivateKey);
      let groupKey = privateKey.decrypt(key);
      this.roomKey = groupKey;
      await AsyncStorage.setItem(`room/${this.roomId}/groupKey`, groupKey);
      this.establishIsLoading = false;
      this.establishIsLoaded = true;
    })
  }
  @action removeEstablishListeners() {
    socket.removeEventListener('establishStart');
    socket.removeEventListener('establishEnd');
    socket.removeEventListener('establish');
    socket.removeEventListener('groupKey');
  }

  @action generateGroupKey() {
    return new Promise((res, rej) => {
      let salt = crypto.lib.WordArray.random(128/8);
      let passphrase = crypto.SHA512(new Date().getTime().toString()).toString(crypto.enc.Hex);
      let key128Bits = crypto.PBKDF2(passphrase, salt, { keySize: 128/32 }).toString(crypto.enc.Hex);

      res(key128Bits);
    })
  }

  @action async encryptGroupKey(groupKey, clients) {
    await clients.forEach(async c => {
      let pubKey = await pki.publicKeyFromPem(c.publicKeyPem);
      c.ecryptedGroupKey = await pubKey.encrypt(groupKey);
    })
    
    return clients;
  }

  @action encryptMessage(messageText) {
    return crypto.AES.encrypt(messageText, this.roomKey).toString();
  }
  @action decryptMessage(messageText) {
    return crypto.AES.decrypt(messageText, this.roomKey).toString(crypto.enc.Utf8);
  }

  @action requestGroupKey({ publicKeyPem }) {
    return new Promise((res, rej) => {
      socket.on('sharedGroupKey', groupKey => {
        res(groupKey)
      })
      socket.emit('groupKeyRequest', { roomId: this.roomId, publicKeyPem })
    })
  }

  @action async requestGroupKeyShare() {
    this.requestGroupKeyIsLoading = true;

    const secKey = await AsyncStorage.getItem('userSecKey');
    const pubKey = await AsyncStorage.getItem('userPubKey');
    const privateKey = pki.privateKeyFromPem(secKey);
    const encGroupKey = await this.requestGroupKey({ publicKeyPem: pubKey });
    if(encGroupKey.success) {
      const groupKey = privateKey.decrypt(encGroupKey.groupKey);
      this.roomKey = groupKey;
      await AsyncStorage.setItem(`room/${this.roomId}/groupKey`, groupKey);
      this.getRoomMessages();
    } else {
      this.requestGroupKeyError = true;
    }
    this.requestGroupKeyIsLoading = false;
    this.requestGroupKeyIsLoaded = true;
  }

}

const roomMessageStore = new ObservableRoomMessageStore();
export default roomMessageStore;