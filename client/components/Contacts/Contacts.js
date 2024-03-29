import React,{Component} from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { ListItem, Icon, Button, Avatar } from 'react-native-elements';
import { observer, inject } from 'mobx-react';

import { avatarsUrl } from '../../mobx/config';

const DeleteContactButton = (props) => (
  <Button
    icon={
      <Icon
        name='user-times'
        type='font-awesome'
        color='#167B14'
        size={19}
      />
    }
    buttonStyle={{marginHorizontal: 3}}
    containerStyle={{padding: 0}}
    onPress={() => props.deleteContact(props.userId)}
    type='clear'
  />
)

const AddContactButton = (props) => (
  <Button
    icon={
      <Icon
        name='user-plus'
        type='font-awesome'
        color='#09C709'
        size={17}
      />
    }
    containerStyle={{width: 50, marginRight: 5}}
    onPress={props.addContact}
    type='clear'
  />
)

class Contacts extends Component {
  constructor(props){
    super(props);

    this.state = { }
  }

  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Contacts',
      headerStyle: {
        backgroundColor: '#222222'
      },
      headerTintColor: '#09C709',
      headerTitleStyle: {
        fontWeight: 'bold'
      },
      headerLeft: (
        <Button
          icon={
            <Icon
              name='bars'
              type='font-awesome'
              color='#09C709'
              size={21}
            />
          }
          containerStyle={{marginLeft: 10}}
          onPress={navigation.openDrawer}
          type='clear'
        />
      ),
      headerRight: (
        <AddContactButton addContact={navigation.getParam('addContact')}/>
      )
    };
  }

  componentDidMount(){
    this.props.contactStore.getContacts();
  }

  componentWillMount(){
    this.props.navigation.setParams({ 
      addContact: this.addContact
    });
  }

  // ADD CONTACT OPERATION
  addContact = () => {
    this.props.navigation.navigate('ContactAddition');
  }

  // DELETE CONTACT OPERATION
  deleteContact = (id) => {
    this.props.contactStore.deleteContact(id);
  }

  renderContact = ({item, index}) => {
    return(
      <ListItem
        title={item.username}
        leftElement={
          <Avatar
            rounded
            size='medium'
            source={{uri: avatarsUrl + item.avatarId}}
          />
        }
        bottomDivider
        rightElement={
          <DeleteContactButton
            deleteContact={this.deleteContact}
            userId={item._id}
          />
        }
        containerStyle={{backgroundColor: '#151516', height: 70}}
        titleStyle={{
          fontSize: 17,
          color: '#fff'
        }}
      />
    )
  }

  render(){
    if(this.props.contactStore.contactsIsLoading){
      return(
        <View style={styles.emptyScreen}>
          <Loading size={'large'}/>
        </View>
      )
    } else if(!this.props.contactStore.contactList.length){
      return(
        <View style={styles.emptyScreen}>
          <Text style={{color: 'grey', fontSize: 20}}>Contact list is empty</Text>
        </View>
      )
    } else {
      return(
        <View style={{height: '100%', flexDirection: 'column', backgroundColor: '#151516'}}>
          <FlatList
            data={this.props.contactStore.contactList}
            renderItem={this.renderContact}
            keyExtractor={i => i._id.toString()}
            contentContainerStyle={{
              paddingBottom: 20,
              marginVertical: 0
            }}
            removeClippedSubviews={true}
          />
        </View>
      )
    }
  }
}

const styles = StyleSheet.create({
  emptyScreen: {
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151516'
  }
})

export default inject('contactStore')(observer(Contacts));
