process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
require('mocha')
const chai = require('chai');
const chaiHttp = require('chai-http');
const url = require('../../config').url;
const auth = require('../../authenticate');

const { expect } = chai;

chai.use(chaiHttp);

describe('Rooms', () => {
  const path = '/rooms';

  let userId;
  let roomId;
  let messageId;
  let token;

  before((done) => {
    chai.request(url)
      .post('/auth/signin')
      .send({
        username: 'testtest',
        password: '123123123123'
      })
      .end((err, res) => {
        token = res.body.token;
        userId = auth.jwtDecode(token)._id;
        done();
      })
  });

  it('/GET rooms', done => {
    chai.request(url)
      .get(path)
      .set('Authorization', `bearer ${token}`)
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.equal(0);

        done();
      });
  });

  /* it('/POST rooms (private)', done => {
    chai.request(url)
      .post(path)
      .set('Authorization', `bearer ${token}`)
      .send({
        name: 'TestRoom',
        users: [],
        type: 'private',
        publicKey: '1234-1234'
      })
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.include.all.keys('_id', 'name', 'creator', 'messages');
        expect(res.body.users.length).to.be.equal(1);

        

        done();
      })
  }); */

  it('/POST rooms', done => {
    chai.request(url)
      .post(path)
      .set('Authorization', `bearer ${token}`)
      .send({
        name: 'TestRoom',
        users: [],
        time: 2000
      })
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.include.all.keys('_id', 'name', 'creator', 'messages');
        expect(res.body.users.length).to.be.equal(1);

        roomId = res.body._id;

        done();
      })
  });

  it('/GET rooms/:id', done => {
    const currentPath = path + '/' + roomId;

    chai.request(url)
      .get(currentPath)
      .set('Authorization', `bearer ${token}`)
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.include.all.keys('_id', 'name', 'creator', 'messages');
        expect(res.body.users.length).to.be.equal(1);

        done();
      })
  });

  it('/POST rooms/:id/users', done => {
    const currentPath = path + '/' + roomId + '/users';

    chai.request(url)
      .post(currentPath)
      .set('Authorization', `bearer ${token}`)
      .send({
        users: ['5de21323057bfb5468f30c79']
      })
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.equal(2);

        done();
      })
  })

  it('/DELETE rooms/:id/users/:id', done => {
    const currentPath = path + '/' + roomId + '/users/5de21323057bfb5468f30c79';

    chai.request(url)
      .delete(currentPath)
      .set('Authorization', `bearer ${token}`)
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.equal(1);

        done();
      })
  })

  it('/PUT rooms/:id', done => {
    const currentPath = path + '/' + roomId;
    const updatedName = 'UpdatedName';

    chai.request(url)
      .put(currentPath)
      .set('Authorization', `bearer ${token}`)
      .send({
        name: updatedName
      })
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.include.all.keys('_id', 'name', 'creator', 'messages');
        expect(res.body.users.length).to.be.equal(1);
        expect(res.body.name).to.be.equal(updatedName);

        done();
      })
  })

  it('/GET rooms/:id/messages', done => {
    const currentPath = path + '/' + roomId + '/messages';

    chai.request(url)
      .get(currentPath)
      .set('Authorization', `bearer ${token}`)
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.equal(0);

        done();
      })
  });

  it('/POST rooms/:id/messages', done => {
    const currentPath = path + '/' + roomId + '/messages';

    chai.request(url)
      .post(currentPath)
      .set('Authorization', `bearer ${token}`)
      .send({
        text: 'TestTestTest',
        hash: '123'
      })
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.include.all.keys('_id', 'text', 'sender', 'hash');

        messageId = res.body._id;

        done();
      })
  });

  it('/GET rooms/:id/messages', done => {
    const currentPath = path + '/' + roomId + '/messages';

    chai.request(url)
      .get(currentPath)
      .set('Authorization', `bearer ${token}`)
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.equal(1);

        done();
      })
  });

  /* it('/GET rooms/:id/messages/:id', done => {
    const currentPath = path + '/' + roomId + '/messages/' + messageId;

    chai.request(url)
      .get(currentPath)
      .set('Authorization', `bearer ${token}`)
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.include.all.keys('_id', 'text', 'sender');

        done();
      })
  }); */

  /* it('/PUT rooms/:id/messages/:id', done => {
    const currentPath = path + '/' + roomId + '/messages/' + messageId;
    const updatedText = 'UpdatedTest';

    chai.request(url)
      .put(currentPath)
      .set('Authorization', `bearer ${token}`)
      .send({
        text: updatedText
      })
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.include.all.keys('_id', 'text', 'sender');
        expect(res.body.text).to.be.equal(updatedText);

        done();
      })
  }) */

  /* it('/DELETE rooms/:id/messages/:id', done => {
    const currentPath = path + '/' + roomId + '/messages/' + messageId;

    chai.request(url)
      .delete(currentPath)
      .set('Authorization', `bearer ${token}`)
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.include.all.keys('_id', 'text', 'sender');

        done();
      })
  }) */

  /* it('/DELETE rooms/:id/messages', done => {
    const currentPath = path + '/' + roomId + '/messages';

    chai.request(url)
      .delete(currentPath)
      .set('Authorization', `bearer ${token}`)
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.equal(0);

        done();
      })
  }); */

  it('/DELETE rooms/:id', done => {
    const currentPath = path + '/' + roomId;

    chai.request(url)
      .delete(currentPath)
      .set('Authorization', `bearer ${token}`)
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.include.all.keys('_id', 'name', 'creator', 'messages');
        expect(res.body.users.length).to.be.equal(1);

        done();
      });
  });

  it('/DELETE rooms', done => {
    chai.request(url)
      .delete(path)
      .set('Authorization', `bearer ${token}`)
      .end((err, res) => {
        expect(res.status).to.be.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.all.keys('n', 'ok', 'deletedCount');

        done();
      });
  });

});