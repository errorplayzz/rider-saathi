import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
	ArrowLeftIcon, 
	ArrowRightIcon,
	SparklesIcon, 
	CheckCircleIcon,
	RocketLaunchIcon
} from '@heroicons/react/24/outline'
import features from '../data/features'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import TiltCard from '../components/TiltCard'
import MagneticButton from '../components/MagneticButton'
import AnimatedBackground from '../components/AnimatedBackground'

const FeatureDetails = () => {
	const { slug } = useParams()
	const { isDark } = useTheme()
	const feature = features.find((f) => f.slug === slug)

	if (!feature) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-ink transition-colors duration-300">
				<AnimatedBackground />
				<div className="text-center p-6 relative z-10">
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5 }}
					>
						<h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-alabaster">Feature Not Found</h2>
						<p className="text-lg text-slate-600 dark:text-dusty mb-8 max-w-md mx-auto">
							We couldn't find the feature you're looking for.
						</p>
						<Link to="/">
							<MagneticButton variant="primary">
								<ArrowLeftIcon className="w-5 h-5 mr-2" />
								Back to Home
							</MagneticButton>
						</Link>
					</motion.div>
				</div>
			</div>
		)
	}

	const benefits = [
		"Real-time synchronization across all devices",
		"Advanced security and privacy protection",
		"Seamless integration with existing systems",
		"24/7 automated monitoring and alerts"
	]

	return (
		<div className="min-h-screen bg-[#0f0f0f] text-[#F5F5F7] transition-colors duration-300">
			<AnimatedBackground />
			
			{/* Hero Section */}
			<section className="relative pt-24 pb-12 px-4 overflow-hidden">
				<div className="max-w-7xl mx-auto relative z-10">
					{/* Breadcrumb */}
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="mb-8"
					>
						<Link 
							to="/" 
							className="inline-flex items-center gap-2 text-sm text-[#86868B] hover:text-[#B08968] transition-colors group"
						>
							<ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
							Back to Features
						</Link>
					</motion.div>

					{/* Hero Content */}
					<div className="grid lg:grid-cols-2 gap-12 items-center">
						{/* Left: Text Content */}
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
						>
							<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#B08968]/10 border border-[#B08968]/20 mb-6 backdrop-blur-md">
								<SparklesIcon className="w-4 h-4 text-[#B08968]" />
								<span className="text-[#B08968] text-xs font-semibold uppercase tracking-wider">
									Premium Feature
								</span>
							</div>

							<div className="flex items-start gap-4 mb-6">
								<div className="text-6xl">{feature.icon}</div>
								<div>
									<h1 className="text-4xl md:text-5xl font-medium text-[#F5F5F7] mb-4 tracking-tight leading-tight">
										{feature.title}
									</h1>
									<p className="text-lg text-[#86868B] leading-relaxed">
										{feature.description}
									</p>
								</div>
							</div>

							{/* CTA Buttons */}
							<div className="flex flex-wrap gap-4 mt-8">
								<Link 
									to="/dashboard"
									className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#B08968] text-[#0f0f0f] font-medium hover:bg-[#c39b7a] transition-all duration-300 hover:shadow-[0_0_20px_rgba(176,137,104,0.4)] hover:-translate-y-0.5"
								>
									<RocketLaunchIcon className="w-5 h-5 mr-2" />
									Try It Now
								</Link>
								<a 
									href="#detailed-overview" 
									className="px-8 py-3 rounded-full border border-[#ffffff20] text-[#F5F5F7] hover:border-[#B08968] hover:text-[#B08968] transition-all duration-300 font-medium"
								>
									Learn More
								</a>
							</div>
						</motion.div>

						{/* Right: Image */}
						<motion.div
							initial={{ opacity: 0, x: 30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
						>
							<TiltCard glowColor="rgba(176, 137, 104, 0.1)" intensity={2}>
								<div className="relative rounded-2xl overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.4)] border border-[#ffffff0a]">
									<img 
										src={feature.image} 
										alt={feature.title} 
										className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
										style={{ aspectRatio: '16/10' }}
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent pointer-events-none" />
								</div>
							</TiltCard>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Benefits Section */}
			<section className="py-16 px-4 relative z-10">
				<div className="max-w-7xl mx-auto">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="mb-12 text-center"
					>
						<h2 className="text-3xl md:text-4xl font-medium tracking-tight text-[#F5F5F7] mb-4">
							Key Benefits
						</h2>
						<p className="text-lg text-[#86868B] max-w-2xl mx-auto">
							Discover what makes this feature essential for your journey
						</p>
					</motion.div>

					<div className="grid md:grid-cols-2 gap-6">
						{benefits.map((benefit, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
								className="group relative p-6 md:p-8 rounded-3xl bg-[#111111] border border-[#ffffff0a] hover:border-[#ffffff20] transition-all duration-300"
							>
								<div className="absolute inset-0 bg-gradient-to-br from-[#B08968]/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
								<div className="relative flex items-start gap-5">
									<div className="flex-shrink-0 p-3 rounded-xl bg-[#B08968]/10 text-[#B08968] transition-colors duration-300">
										<CheckCircleIcon className="w-6 h-6" />
									</div>
									<p className="text-base text-[#F5F5F7] leading-relaxed mt-1">
										{benefit}
									</p>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Detailed Overview Section */}
			<section id="detailed-overview" className="py-16 px-4 relative z-10">
				<div className="max-w-4xl mx-auto">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="relative"
					>
						<div className="relative z-10 text-center mb-16">
							<h2 className="text-3xl md:text-4xl font-medium tracking-tight text-[#F5F5F7] mb-6 inline-flex items-center justify-center gap-4">
								<SparklesIcon className="w-8 h-8 text-[#B08968]" />
								Detailed Overview
							</h2>
						</div>

						<div className="relative z-10">
							{feature.longDescription ? (
								feature.longDescription.split('\n\n').map((para, idx) => (
									<motion.p 
										key={idx} 
										initial={{ opacity: 0, y: 10 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{ duration: 0.5, delay: idx * 0.1 }}
										className="text-lg text-[#86868B] mb-10 leading-relaxed first-letter:text-5xl first-letter:font-medium first-letter:text-[#F5F5F7] first-letter:float-left first-letter:mr-4 first-letter:mt-1 first-letter:leading-none"
									>
										{para}
									</motion.p>
								))
							) : (
								<p className="text-lg text-[#86868B] mb-10 leading-relaxed">
									{feature.description}
								</p>
							)}
						</div>

						{/* Feature Stats/Highlights */}
						<div className="mt-20 pt-12 border-t border-[#ffffff0a] relative z-10">
							<div className="grid grid-cols-3 gap-8 text-center max-w-2xl mx-auto">
								<div className="group">
									<div className="text-4xl font-medium text-[#F5F5F7] mb-2 group-hover:text-[#B08968] transition-colors duration-300">24/7</div>
									<div className="text-sm uppercase tracking-widest text-[#86868B] font-medium">Availability</div>
								</div>
								<div className="group">
									<div className="text-4xl font-medium text-[#F5F5F7] mb-2 group-hover:text-[#B08968] transition-colors duration-300">100%</div>
									<div className="text-sm uppercase tracking-widest text-[#86868B] font-medium">Secure</div>
								</div>
								<div className="group">
									<div className="text-4xl font-medium text-[#F5F5F7] mb-2 group-hover:text-[#B08968] transition-colors duration-300">∞</div>
									<div className="text-sm uppercase tracking-widest text-[#86868B] font-medium">Reliable</div>
								</div>
							</div>
						</div>
					</motion.div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 px-4 relative z-10">
				<div className="max-w-4xl mx-auto">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="relative overflow-hidden rounded-3xl bg-[#111111] border border-[#ffffff0a]"
					>
						<div className="absolute inset-0 bg-gradient-to-br from-[#B08968]/5 to-transparent pointer-events-none" />
						
						<div className="relative text-center p-12 md:p-20 z-10">
							<h2 className="text-3xl md:text-5xl font-medium tracking-tight text-[#F5F5F7] mb-4">
								Ready to Experience It?
							</h2>
							<p className="text-lg text-[#86868B] mb-10 max-w-2xl mx-auto">
								Join thousands of riders who trust Rider Saathi for their safety and convenience
							</p>
							<div className="flex flex-wrap gap-6 justify-center items-center">
								<Link 
									to="/dashboard"
									className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#B08968] text-[#0f0f0f] font-medium hover:bg-[#c39b7a] transition-all duration-300 hover:shadow-[0_0_20px_rgba(176,137,104,0.4)] hover:-translate-y-0.5"
								>
									<RocketLaunchIcon className="w-5 h-5 mr-2" />
									Get Started Now
								</Link>
								<Link to="/#safety-section" className="group flex items-center gap-2 text-[#86868B] hover:text-[#F5F5F7] transition-colors font-medium">
									Explore More Features
									<ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
								</Link>
							</div>
						</div>
					</motion.div>
				</div>
			</section>

			<Footer />
		</div>
	)
}

export default FeatureDetails

