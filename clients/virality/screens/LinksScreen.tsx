import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { RectButton, ScrollView } from 'react-native-gesture-handler';

export default function LinksScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <OptionButton
        icon="md-bed"
        label="Coronavirus Self-Checker"
        onPress={() => WebBrowser.openBrowserAsync('https://www.cdc.gov/coronavirus/2019-ncov/symptoms-testing/index.html')}
      />

      <OptionButton
        icon="md-map"
        label="COVID-19 Live Map"
        onPress={() => WebBrowser.openBrowserAsync('https://coronavirus.jhu.edu/map.html')}
      />

      <OptionButton
        icon="md-globe"
        label="Unites States COVID-19 information"
        onPress={() => WebBrowser.openBrowserAsync('https://www.cdc.gov/coronavirus/2019-ncov/about/index.html')}
        isLastOption
      />

      <OptionButton
        icon="md-globe"
        label="Coronavirus advisory information"
        onPress={() => WebBrowser.openBrowserAsync('https://www.who.int/emergencies/diseases/novel-coronavirus-2019/advice-for-public')}
        isLastOption
      />

      <OptionButton
        icon="md-globe"
        label="Coronavirus condition overview"
        onPress={() => WebBrowser.openBrowserAsync('https://www.who.int/health-topics/coronavirus')}
        isLastOption
      />

      <OptionButton
        icon="md-globe"
        label="Coronavirus Q&A"
        onPress={() => WebBrowser.openBrowserAsync('https://www.who.int/news-room/q-a-detail/q-a-coronaviruses')}
        isLastOption
      />
    </ScrollView>
  );
}

function OptionButton({ icon, label, onPress, isLastOption=false }) {
  return (
    <RectButton style={[styles.option, isLastOption && styles.lastOption]} onPress={onPress}>
      <View style={{ flexDirection: 'row' }}>
        <View style={styles.optionIconContainer}>
          <Ionicons name={icon} size={22} color="rgba(0,0,0,0.35)" />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionText}>{label}</Text>
        </View>
      </View>
    </RectButton>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  contentContainer: {
    paddingTop: 15,
  },
  optionIconContainer: {
    marginRight: 12,
  },
  optionTextContainer: {

  },
  option: {
    backgroundColor: '#fdfdfd',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: '#ededed',
  },
  lastOption: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 15,
    alignSelf: 'flex-start',
    marginTop: 1,
  },
});
