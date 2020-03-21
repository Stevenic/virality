import React from 'react';
import { StyleSheet, Text, View, FlatList } from 'react-native';

interface ContactsScreenState {
  data: ContactRecord[];
}

interface ContactRecord {
  id: string;
  title: string;
  when: string;
  viewed: boolean;
}

function Item({ item }) {
  return (
    <View style={styles.listItem}>
      <Text style={{fontWeight:"bold"}}>{item.title}</Text>
    </View>
  );
}

export default class ContactsScreen extends React.Component<{}, ContactsScreenState> {
  constructor(props) {
    super(props);
    this.state = {
      data: this.generateData(50)
    };
  }

  public render(){
    return (
      <View style={styles.container}>
        <FlatList
          style={{flex:1}}
          data={this.state.data}
          renderItem={({ item }) => <Item item={item}/>}
          keyExtractor={item => item.id}
        />
      </View>
    );
  }

  private generateData(count: number): ContactRecord[] {
    const generated: ContactRecord[] = [];
    const titles = [
      '34918 SE Moffat ST, Snoqualmie, WA',
      'Safeway, Snoqualmie, WA',
      '44 Edgewater Drive, Camano Island, WA',
      'QFC, Stanwood, WA',
      'Starbucks, Snoqualmie, WA',
      'Starbucks, Stanwood, WA',
      'Lowes, Smokey Point, WA'
    ];
    let time = new Date().getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    for (let i = 0; i < count; i++) {
      time = time - ((1000 * 60 * 10) + Math.floor(Math.random() * oneDay));
      const title = titles[Math.floor(Math.random() * titles.length)];
      generated.push({
        id: i.toString(),
        title: title,
        when: new Date(time).toISOString(),
        viewed: (i >= 2) 
      });
    }

    return generated;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7'
  },
  listItem:{
    margin:10,
    padding:10,
    backgroundColor:"#FFF",
    width:"80%",
    flex:1,
    alignSelf:"center",
    flexDirection:"row",
    borderRadius:5
  }
});
