import { View, Image, Platform, Alert } from 'react-native'
import Colors from '@/constants/Colors'
import { SafeAreaView } from 'react-native-safe-area-context'
import PText from '@/components/elements/PText'
import PButton from '@/components/elements/PButton'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'

import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { getPushToken } from '@/helpers/push-token'
import client from '@/queries/api'
import getDeviceType from '@/helpers/device-type'
import { useSession } from '@/contexts/SessionContext'

function handleRegistrationError(errorMessage: string) {
	alert(errorMessage)
	throw new Error(errorMessage)
}

export default function SetupPage() {
	const router = useRouter()

	const [deviceName, setDeviceName] = useState<string | null | undefined>(
		null
	)
	const { setToken } = useSession()

	async function askForDeviceName() {
		if (Platform.OS === 'ios') {
			Alert.prompt('Device Name', 'Enter a name for this device', [
				{
					text: 'Continue',
					style: 'default',
					onPress: (value) => {
						setDeviceName(value)
						setupDevice()
					},
				},
			])
		} else {
			setupDevice()
		}
	}

	async function askForNotificationPermission() {
		if (Platform.OS === 'android') {
			Notifications.setNotificationChannelAsync('default', {
				name: 'default',
				importance: Notifications.AndroidImportance.MAX,
				vibrationPattern: [0, 250, 250, 250],
				lightColor: '#FF231F7C',
			})
		}

		if (Device.isDevice) {
			const { status: existingStatus } =
				await Notifications.getPermissionsAsync()

			if (existingStatus === 'denied') {
				handleRegistrationError(
					'Please enable Push Notifications in Settings!'
				)
				return
			}

			let finalStatus: Notifications.PermissionStatus = existingStatus
			if (existingStatus !== 'granted') {
				const { status } = await Notifications.requestPermissionsAsync()
				finalStatus = status
			}

			if (finalStatus !== 'granted') {
				handleRegistrationError(
					'Permission not granted to get push token for push notification!'
				)
				return
			}
			try {
				const pushToken = getPushToken()
				return pushToken
			} catch (error) {
				handleRegistrationError(`${error}`)
			}
		} else {
			handleRegistrationError(
				'Must use physical device for push notifications'
			)
		}
	}

	async function setupDevice() {
		const pushToken = await askForNotificationPermission()
		if (!pushToken) return handleRegistrationError('Push token not found')

		const deviceInfo = {
			deviceName: deviceName ?? Device.deviceName ?? 'Unknown Device',
			deviceType: getDeviceType(),
			devicePlatform: Platform.OS.toUpperCase(),
			deviceYearClass: Device.deviceYearClass,
			deviceManufacturer: Device.manufacturer,
			deviceModelName: Device.modelName,
			deviceOsName: Device.osName,
			deviceOsVersion: Device.osVersion,
			pushToken: pushToken,
		}

		console.log('Device Info:', deviceInfo)

		try {
			await client.post('/device', deviceInfo)
		} catch (error: any) {
			const errorMessage =
				error?.response?.data?.error ||
				error?.message ||
				error?.error ||
				error ||
				'An unknown error occurred.'
			console.error(errorMessage)
			alert(errorMessage)
			return
		}
		try {
			await client.refreshToken(pushToken)
			setToken(pushToken)
			router.replace('/(tabs)')
		} catch (error: any) {
			const errorMessage =
				error?.response?.data?.error ||
				error?.message ||
				error?.error ||
				error ||
				'An unknown error occurred.'
			console.error(errorMessage)
			alert(errorMessage)
			return
		}
	}

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
			<View
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<Image
					source={require('@/assets/imgs/pushover.png')}
					style={{ width: 100, height: 100 }}
				/>
			</View>
			<View style={{ flex: 1, gap: 12, paddingHorizontal: 28 }}>
				<View style={{ marginBottom: 24 }}>
					<PText size="2xl" weight="semibold">
						Pushify - notifications with ease
					</PText>
					<PText>
						To get started, you need to setup this device to receive
						notifications.
					</PText>
				</View>
				<PButton
					trailingContent={
						<Ionicons name="arrow-forward" size={24} />
					}
					label="Setup this device"
					onPress={askForDeviceName}
				/>
			</View>
		</SafeAreaView>
	)
}
